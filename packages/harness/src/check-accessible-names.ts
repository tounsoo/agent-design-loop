import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  auditPreview,
  declarationsFile,
  flattenAxTree,
  parseDeclarations,
  type Announcement,
  type CdpAxNode,
  type AxNode,
  type DomElement,
} from "./lib/accessible-names";
import { actionName, actionsOf, applyKnownGaps, auditPress, keyFor, parseKnownGaps, signature, type FoundProblem, type KnownGap } from "./lib/presses";
import { config } from "./lib/config";
import { previewQueries } from "./lib/previews";
import { withServedApp } from "./lib/served-app";

/**
 * Opens every preview check:target-size opens and reads what a screen reader
 * hears there from Chrome's accessibility tree. Each flow declares it in
 * accessible-names.ts beside its views module. Then it presses each action on
 * the preview, one per fresh load, and fails a press that changes the page
 * without telling a screen reader, or that drops focus to the page body.
 */

const problems: string[] = [];
const declared = new Map<string, { announcements: Announcement[]; files: string[] }>();
const knownGaps = new Map<string, { gaps: KnownGap[]; queries: string[] }>();

// Flows whose views share a folder share one declarations file, so each file is read against all their previews.
const byFile = new Map<string, { queries: string[]; failed: boolean }>();
for (const [index, flow] of config.flows.entries()) {
  const { queries, problems: previewProblems } = await previewQueries([flow], index);
  problems.push(...previewProblems);
  const file = declarationsFile(flow.views);
  const entry = byFile.get(file) ?? { queries: [], failed: false };
  for (const query of queries) if (!entry.queries.includes(query)) entry.queries.push(query);
  // A flow whose previews cannot be read has no list to hold its file to, so its file waits for that fix.
  if (previewProblems.length > 0) entry.failed = true;
  byFile.set(file, entry);
}

for (const [file, { queries, failed }] of byFile) {
  if (failed) continue;
  if (!existsSync(file)) {
    problems.push(
      `${file} is missing. Beside the flow's views module, export const accessibleNames = { "<preview>": [{ role, name or text }] } satisfies AccessibleNames, with one entry for each of its ${queries.length} previews.`,
    );
    continue;
  }
  let module: { accessibleNames?: unknown; knownGaps?: unknown };
  try {
    module = (await import(pathToFileURL(path.resolve(file)).href)) as { accessibleNames?: unknown; knownGaps?: unknown };
  } catch (error) {
    problems.push(`${file} does not load: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }
  const parsed = parseDeclarations(module.accessibleNames, file, queries);
  problems.push(...parsed.problems);
  const gaps = parseKnownGaps(module.knownGaps, file, queries);
  problems.push(...gaps.problems);
  knownGaps.set(file, { gaps: gaps.gaps, queries });
  for (const query of queries) {
    const entry = declared.get(query) ?? { announcements: [], files: [] };
    entry.announcements.push(...(parsed.declarations[query] ?? []));
    if (!entry.files.includes(file)) entry.files.push(file);
    declared.set(query, entry);
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`accessible names: ${problem}`);
  process.exit(1);
}

const count = [...declared.values()].reduce((total, entry) => total + entry.announcements.length, 0);

// `--list` checks the declarations and stops before Chrome, so the fixtures can test them without a build.
if (process.argv.includes("--list")) {
  for (const [query, entry] of declared) console.log(`accessible names: preview ?${query} declares ${entry.announcements.length}`);
  console.log(`accessible names: ${declared.size} previews declare ${count} announcements.`);
  process.exit(0);
}

const failures: string[] = [];
const pressProblems: FoundProblem[] = [];
let pressCount = 0;

await withServedApp("accessible names", async (page, base) => {
  const session = await page.createCDPSession();
  await session.send("Page.enable");
  let navigated = false;
  session.on("Page.frameNavigated", (event: { frame: { parentId?: string } }) => {
    if (event.frame.parentId === undefined) navigated = true;
  });

  const settle = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0)))));
  const read = async (): Promise<{ tree: AxNode[]; elements: Map<number, DomElement> }> => {
    const { root } = (await session.send("DOM.getDocument", { depth: -1, pierce: true })) as { root: DomNode };
    const { nodes } = (await session.send("Accessibility.getFullAXTree")) as { nodes: CdpAxNode[] };
    const elements = elementsOf(root);
    return { tree: flattenAxTree(nodes, elements), elements };
  };
  const focused = async (): Promise<{ backendId: number | null; onBody: boolean }> => {
    const { result } = (await session.send("Runtime.evaluate", { expression: "document.activeElement" })) as { result: { objectId?: string } };
    const onBody = (await page.evaluate(() => document.activeElement === null || document.activeElement === document.body)) as boolean;
    if (onBody || result.objectId === undefined) return { backendId: null, onBody: true };
    const { node } = (await session.send("DOM.describeNode", { objectId: result.objectId })) as { node: { backendNodeId: number } };
    return { backendId: node.backendNodeId, onBody: false };
  };

  for (const [query, entry] of declared) {
    const url = new URL(base);
    url.search = query;
    await page.goto(url.href, { waitUntil: "networkidle0" });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))));
    const { tree } = await read();
    for (const problem of auditPreview(tree, entry.announcements, entry.files.join(" and "))) failures.push(`?${query}: ${problem}`);

    // Each press starts from a fresh load, so one press cannot hide or cause another's problem.
    for (const [index, action] of actionsOf(tree).entries()) {
      await page.goto(url.href, { waitUntil: "load" });
      await settle();
      const fresh = actionsOf((await read()).tree)[index];
      if (fresh?.backendId == null || signature(fresh) !== signature(action)) {
        failures.push(`?${query}: the preview does not render the same actions on every load, so ${actionName(action)} cannot be pressed on its own. Keep the preview the same from one load to the next.`);
        continue;
      }
      try {
        await session.send("DOM.focus", { backendNodeId: fresh.backendId });
      } catch {
        failures.push(`?${query}: ${actionName(action)} is an action a person presses, and a keyboard cannot focus it. Use a native control from the catalog, or give it tabindex="0" and a key handler.`);
        continue;
      }
      await settle();
      const before = await read();
      const target = before.tree.find((node) => node.backendId === fresh.backendId) ?? fresh;
      navigated = false;
      pressCount += 1;
      try {
        await page.keyboard.press(keyFor(target));
        await settle();
      } catch (error) {
        if (!navigated) throw error;
      }
      // A press that loads another document hands the reader a new page, which a screen reader reads from the top.
      if (navigated) continue;
      const after = await read();
      const problem = auditPress({ action: target, before: before.tree, after: after.tree, focus: await focused(), inDocument: after.elements.has(fresh.backendId) });
      if (problem !== null) pressProblems.push({ ...problem, preview: query });
    }
  }
});

// A problem any of its preview's files lists is known; each file's list is held to the problems on its own previews.
const listed = new Set<FoundProblem>();
for (const [file, { gaps, queries }] of knownGaps) {
  const result = applyKnownGaps(pressProblems.filter((problem) => queries.includes(problem.preview)), gaps, file);
  for (const problem of result.listed) listed.add(problem);
  failures.push(...result.stale);
}
for (const problem of pressProblems) if (!listed.has(problem)) failures.push(`?${problem.preview}: ${problem.message}`);

if (failures.length > 0) {
  for (const failure of failures) console.error(`accessible names: ${failure}`);
  process.exit(1);
}

const known = listed.size > 0 ? `, besides ${listed.size} known gap${listed.size === 1 ? "" : "s"} their flows list in knownGaps` : "";
console.log(
  `accessible names: ${declared.size} previews announce the ${count} things their flows declare, and every control has a name. ${pressCount - listed.size} of ${pressCount} presses tell a screen reader what changed and keep focus on the page${known}.`,
);

type DomNode = {
  backendNodeId: number;
  nodeType: number;
  nodeName: string;
  attributes?: string[];
  children?: DomNode[];
  shadowRoots?: DomNode[];
  contentDocument?: DomNode;
};

/** Every element in the document, by backend id, with its attributes. */
function elementsOf(root: DomNode): Map<number, DomElement> {
  const elements = new Map<number, DomElement>();
  const visit = (node: DomNode): void => {
    if (node.nodeType === 1) {
      const attributes: Record<string, string> = {};
      const list = node.attributes ?? [];
      for (let index = 0; index + 1 < list.length; index += 2) attributes[list[index] ?? ""] = list[index + 1] ?? "";
      elements.set(node.backendNodeId, { tag: node.nodeName, attributes });
    }
    for (const child of [...(node.children ?? []), ...(node.shadowRoots ?? []), ...(node.contentDocument ? [node.contentDocument] : [])]) visit(child);
  };
  visit(root);
  return elements;
}
