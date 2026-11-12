import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  auditScenario,
  declarationsFile,
  flattenAxTree,
  parseDeclarations,
  unnamedControls,
  type Announcement,
  type CdpAxNode,
  type AxNode,
  type DomElement,
} from "./lib/accessible-names";
import { actionName, actionsOf, applyKnownGaps, auditPress, keyFor, parseKnownGaps, signature, type FoundProblem, type KnownGap } from "./lib/presses";
import { config } from "./lib/config";
import { loadScenarios, scenariosFile } from "./lib/scenarios";
import { withServedApp } from "./lib/served-app";
import { viewNamed } from "./lib/views";

/**
 * Opens every scenario check:target-size opens, at 1280 by 900 in the light
 * scheme, and reads what a screen reader hears there from Chrome's
 * accessibility tree. Each flow declares it in accessible-names.ts beside its
 * views module. Then it presses each action on the scenario, one per fresh
 * load, and fails a press that changes the page without telling a screen
 * reader, or that drops focus to the page body. Last, it opens each scenario
 * at 390 by 844 as a phone and fails a control with no name, since a phone
 * can show controls a wide view does not.
 */

const problems: string[] = [];
const declared = new Map<string, { announcements: Announcement[]; files: string[] }>();
const knownGaps = new Map<string, { gaps: KnownGap[]; queries: string[] }>();

const { scenarios, problems: scenarioProblems } = await loadScenarios(config.flows);
problems.push(...scenarioProblems);
/** Each scenario's address, by id. */
const searchOf = new Map(scenarios.map((scenario) => [scenario.id, scenario.search]));

// Flows whose views share a folder share one declarations file, so each file is read against all their scenarios.
const byFile = new Map<string, { queries: string[]; failed: boolean }>();
for (const flow of config.flows) {
  const file = declarationsFile(flow.views);
  const entry = byFile.get(file) ?? { queries: [], failed: false };
  for (const scenario of scenarios) if (scenario.file === scenariosFile(flow) && !entry.queries.includes(scenario.id)) entry.queries.push(scenario.id);
  // Scenarios that cannot be read leave no list to hold the file to, so its file waits for that fix.
  if (scenarioProblems.length > 0) entry.failed = true;
  byFile.set(file, entry);
}

for (const [file, { queries, failed }] of byFile) {
  if (failed) continue;
  if (!existsSync(file)) {
    problems.push(
      `${file} is missing. Beside the flow's views module, export const accessibleNames = { "<scenario id>": [{ role, name or text }] } satisfies AccessibleNames, with one entry for each of its ${queries.length} scenarios.`,
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
  for (const [query, entry] of declared) console.log(`accessible names: scenario ${query} declares ${entry.announcements.length}`);
  console.log(`accessible names: ${declared.size} scenarios declare ${count} announcements.`);
  process.exit(0);
}

/**
 * How long after a press the check reads the page: past the 100 ms Todae's
 * announcer waits before it writes its live region on the page body. Inside
 * an open Todae modal it writes about 100 ms later still, which this does not
 * wait for; no product scenario opens one today.
 */
const ANNOUNCER_WAIT_MS = 150;

const failures: string[] = [];
const pressProblems: FoundProblem[] = [];
let pressCount = 0;

await withServedApp("accessible names", config.paths.web, async (page, base) => {
  const session = await page.createCDPSession();
  await session.send("Page.enable");
  const origin = new URL(base).origin;
  // A press that loads another document, noticed when the load is asked for, before it commits.
  let navigated = false;
  const topFrame = (await session.send("Page.getFrameTree")) as { frameTree: { frame: { id: string } } };
  const withoutHash = (href: string) => href.split("#")[0];
  // Asked for: a link or script loads another URL in this tab. A move to a fragment of the same page is not a new document, and a new tab or a download leaves this page where it is.
  session.on("Page.frameRequestedNavigation", (event: { frameId: string; url: string; disposition: string }) => {
    if (event.frameId === topFrame.frameTree.frame.id && event.disposition === "currentTab" && withoutHash(event.url) !== withoutHash(page.url())) navigated = true;
  });
  // Committed: another document replaced this one, which a same-document change of history never does.
  session.on("Page.frameNavigated", (event: { frame: { parentId?: string } }) => {
    if (event.frame.parentId === undefined) navigated = true;
  });
  // A dialog would stop the page; dismiss it and go on, as a press that opens one is still read.
  page.on("dialog", (dialog) => void dialog.dismiss().catch(() => undefined));

  const settle = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 0)))));
  // Todae's announcer writes its live region 100 ms after announce(), so a press is read only once that has passed.
  const afterPress = async () => {
    await settle();
    await new Promise((resolve) => setTimeout(resolve, ANNOUNCER_WAIT_MS));
    await settle();
  };
  // Each press starts from a fresh load with nothing stored, so one press cannot cause or hide another's problem.
  const load = async (href: string, waitUntil: "load" | "networkidle0") => {
    await session.send("Storage.clearDataForOrigin", { origin, storageTypes: "local_storage,session_storage,indexeddb" });
    await page.goto(href, { waitUntil });
    await settle();
  };
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
    url.search = searchOf.get(query) ?? "";
    await load(url.href, "networkidle0");
    const { tree } = await read();
    for (const problem of auditScenario(tree, entry.announcements, entry.files.join(" and "))) failures.push(`scenario ${query}: ${problem}`);

    for (const [index, action] of actionsOf(tree).entries()) {
      await load(url.href, "load");
      let fresh = actionsOf((await read()).tree)[index];
      // A scenario still rendering at load gets the same wait as the first read before it counts as different.
      if (fresh?.backendId == null || signature(fresh) !== signature(action)) {
        await load(url.href, "networkidle0");
        fresh = actionsOf((await read()).tree)[index];
      }
      if (fresh?.backendId == null || signature(fresh) !== signature(action)) {
        failures.push(`scenario ${query}: the scenario does not render the same actions on every load, so ${actionName(action)} cannot be pressed on its own. Keep the scenario the same from one load to the next.`);
        continue;
      }
      try {
        await session.send("DOM.focus", { backendNodeId: fresh.backendId });
      } catch {
        failures.push(`scenario ${query}: ${actionName(action)} is an action a person presses, and the check cannot focus it, so a keyboard may not reach it either. Use a native control from the catalog, or give it tabindex="0" and a key handler.`);
        continue;
      }
      await settle();
      if ((await focused()).backendId !== fresh.backendId) {
        failures.push(`scenario ${query}: focusing ${actionName(action)} moves focus somewhere else, so a keyboard cannot press it. Keep focus on a control once it has it.`);
        continue;
      }
      const before = await read();
      const target = before.tree.find((node) => node.backendId === fresh.backendId) ?? fresh;
      navigated = false;
      try {
        await page.keyboard.press(keyFor(target));
        await afterPress();
      } catch (error) {
        // The page's context goes away when a document loads; give the navigation events a moment to say so.
        await new Promise((resolve) => setTimeout(resolve, 200));
        if (!navigated) throw error;
      }
      // A press that loads another document hands the reader a new page, which a screen reader reads from the top. It is not counted.
      if (navigated) continue;
      pressCount += 1;
      const after = await read();
      const problem = auditPress({ action: target, before: before.tree, after: after.tree, focus: await focused(), inDocument: after.elements.has(fresh.backendId) });
      if (problem !== null) pressProblems.push({ ...problem, scenario: query });
    }
  }

  // The phone pass: what a phone shows in place of the wide layout, such as a menu button, is named too.
  const phone = viewNamed("phone-light");
  await page.setViewport({ width: phone.width, height: phone.height, isMobile: true, hasTouch: true });
  for (const query of declared.keys()) {
    const url = new URL(base);
    url.search = searchOf.get(query) ?? "";
    await load(url.href, "networkidle0");
    for (const problem of unnamedControls((await read()).tree)) {
      const failure = `scenario ${query} at ${phone.width} by ${phone.height}: ${problem}`;
      // A control unnamed at both widths is reported once, at desktop.
      if (!failures.includes(`scenario ${query}: ${problem}`)) failures.push(failure);
    }
  }
});

// A problem any of its scenario's files lists is known; each file's list is held to the problems on its own scenarios.
const listed = new Set<FoundProblem>();
for (const [file, { gaps, queries }] of knownGaps) {
  const result = applyKnownGaps(pressProblems.filter((problem) => queries.includes(problem.scenario)), gaps, file);
  for (const problem of result.listed) listed.add(problem);
  failures.push(...result.stale);
}
for (const problem of pressProblems) if (!listed.has(problem)) failures.push(`scenario ${problem.scenario}: ${problem.message}`);

if (failures.length > 0) {
  for (const failure of failures) console.error(`accessible names: ${failure}`);
  process.exit(1);
}

const known = listed.size > 0 ? `, and the other ${listed.size} ha${listed.size === 1 ? "s a problem its flow lists" : "ve problems their flows list"} in knownGaps` : "";
console.log(
  `accessible names: ${declared.size} scenarios announce the ${count} things their flows declare, and every control has a name at 1280 by 900 and at 390 by 844. ${pressCount - listed.size} of ${pressCount} presses tell a screen reader what changed and keep focus on the page${known}.`,
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
