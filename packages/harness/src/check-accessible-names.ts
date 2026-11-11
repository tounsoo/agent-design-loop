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
  type DomElement,
} from "./lib/accessible-names";
import { config } from "./lib/config";
import { previewQueries } from "./lib/previews";
import { withServedApp } from "./lib/served-app";

/**
 * Opens every preview check:target-size opens and reads what a screen reader
 * hears there from Chrome's accessibility tree. Each flow declares it in
 * accessible-names.ts beside its views module.
 */

const problems: string[] = [];
const declared = new Map<string, { announcements: Announcement[]; files: string[] }>();

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
  let module: { accessibleNames?: unknown };
  try {
    module = (await import(pathToFileURL(path.resolve(file)).href)) as { accessibleNames?: unknown };
  } catch (error) {
    problems.push(`${file} does not load: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }
  const parsed = parseDeclarations(module.accessibleNames, file, queries);
  problems.push(...parsed.problems);
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

await withServedApp("accessible names", async (page, base) => {
  const session = await page.createCDPSession();
  for (const [query, entry] of declared) {
    const url = new URL(base);
    url.search = query;
    await page.goto(url.href, { waitUntil: "networkidle0" });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined))));
    const { root } = (await session.send("DOM.getDocument", { depth: -1, pierce: true })) as { root: DomNode };
    const { nodes } = (await session.send("Accessibility.getFullAXTree")) as { nodes: CdpAxNode[] };
    const tree = flattenAxTree(nodes, elementsOf(root));
    for (const problem of auditPreview(tree, entry.announcements, entry.files.join(" and "))) failures.push(`?${query}: ${problem}`);
  }
});

if (failures.length > 0) {
  for (const failure of failures) console.error(`accessible names: ${failure}`);
  process.exit(1);
}

console.log(`accessible names: ${declared.size} previews announce the ${count} things their flows declare, and every control has a name.`);

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
