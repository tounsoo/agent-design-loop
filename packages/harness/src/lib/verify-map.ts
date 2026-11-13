import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parseConfig } from "./parse-config";
import { loadScenarios } from "./scenarios";

/**
 * The verify map: the feature files under `.claude/skills/verify/features/`
 * that say how to drive what each product renders. Every product the
 * registry finds has a folder there named after its own folder, with a
 * README.md that links each feature file. Each feature file ends with a
 * `## Covers` section that names, in code spans, what it drives:
 *
 *   ## Covers
 *
 *   - Page types: `profile`
 *   - Content layouts: `facts`, `invoice-list`
 *   - Tasks: `approve-vendor-invoice`
 *   - Scenarios: `?scenario=vendor-helios-freight`
 *
 * check:docs holds the map to the product registry both ways: every page
 * type, layout, content layout, task and scenario a product has is covered by
 * one of its feature files, and every name a Covers line gives is one the
 * product has. So a new page type, layout, content layout, task or scenario
 * can't land without a recipe, and a removed one can't stay in the map. It
 * sees names, not pages: a new page built only from a page type and content
 * layouts the product already has, with no new scenario, adds no name, and
 * whether a recipe drives what its Covers line names is the reviewer's call.
 */

/** The verify map's folder, from the repository root. */
export const VERIFY_MAP = ".claude/skills/verify/features";

/** What a product registers, by kind, as the verify map must cover it. */
export type ProductRegistry = {
  /** The product's folder name, which is its verify map folder's name: `meridian`. */
  readonly name: string;
  /** Its harness.config.ts, from the repository root. */
  readonly config: string;
  /** Its page types, each with the `shells` entry that says what kind of page it is. */
  readonly pageTypes: readonly { readonly id: string; readonly kind: PageKind }[];
  readonly layouts: readonly string[];
  readonly contentLayouts: readonly string[];
  readonly tasks: readonly string[];
  /** Scenario ids, which open at `?scenario=<id>`. */
  readonly scenarios: readonly string[];
};

export type PageKind = "primary slot" | "collection" | "content";

/** The labels a Covers line takes, and the registry list each one names. */
export const COVERS = {
  "Page types": "pageTypes",
  Layouts: "layouts",
  "Content layouts": "contentLayouts",
  Tasks: "tasks",
  Scenarios: "scenarios",
} as const;

type Label = keyof typeof COVERS;
type Kind = (typeof COVERS)[Label];

const SINGULAR: Record<Kind, string> = {
  pageTypes: "page type",
  layouts: "layout",
  contentLayouts: "content layout",
  tasks: "task",
  scenarios: "scenario",
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function code(text: string): string {
  return `\`${text}\``;
}

/** A Covers item as the feature file writes it: a scenario as the address search that opens it. */
function written(kind: Kind, name: string): string {
  return kind === "scenarios" ? `?scenario=${name}` : name;
}

function names(registry: ProductRegistry, kind: Kind): readonly string[] {
  return kind === "pageTypes" ? registry.pageTypes.map((pageType) => pageType.id) : registry[kind];
}

/** The product's verify map folder name: its config's folder, `products/meridian` → `meridian`. */
export function productName(config: string): string {
  return path.posix.basename(path.posix.dirname(config.split(path.sep).join("/")));
}

/**
 * A file's lines as Markdown reads them: each with whether it sits in a
 * fenced code block, and its text outside HTML comments. A fence closes only
 * on a run of its own character at least as long, as CommonMark has it, and a
 * comment opened in prose runs to its `-->`; a `<!--` inside a fence is code.
 */
function markdownLines(text: string): { line: string; fenced: boolean }[] {
  const lines: { line: string; fenced: boolean }[] = [];
  let fence: { char: string; length: number } | null = null;
  let comment = false;
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    if (fence) {
      const marker = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(raw)?.[1] ?? "";
      if (marker.startsWith(fence.char) && marker.length >= fence.length) fence = null;
      else lines.push({ line: raw, fenced: true });
      continue;
    }
    let rest = raw;
    let prose = "";
    while (rest !== "") {
      if (comment) {
        const close = rest.indexOf("-->");
        if (close === -1) rest = "";
        else {
          rest = rest.slice(close + 3);
          comment = false;
        }
      } else {
        const open = rest.indexOf("<!--");
        if (open === -1) {
          prose += rest;
          rest = "";
        } else {
          prose += rest.slice(0, open);
          rest = rest.slice(open + 4);
          comment = true;
        }
      }
    }
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(prose)?.[1];
    if (marker !== undefined) {
      fence = { char: marker.charAt(0), length: marker.length };
      continue;
    }
    lines.push({ line: prose, fenced: false });
  }
  return lines;
}

/** Lines outside fenced code blocks and HTML comments. */
function proseLines(text: string): string[] {
  return markdownLines(text)
    .filter((entry) => !entry.fenced)
    .map((entry) => entry.line);
}

/**
 * Every link target a Markdown file gives outside code and comments, without
 * its `./`, angle brackets, anchor or title: inline links and reference
 * definitions. A link inside a code span is code, not a link.
 */
function linkTargets(text: string): Set<string> {
  const targets = new Set<string>();
  const target = String.raw`<?(?:\./)?([^)\s#>]+)>?(?:#[^)\s>]*)?`;
  const inline = new RegExp(String.raw`\]\(\s*${target}(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)`, "g");
  const reference = new RegExp(String.raw`^ {0,3}\[[^\]]+\]:\s*${target}`);
  for (const line of proseLines(text)) {
    const prose = line.replace(/`[^`]*`/g, "");
    for (const match of prose.matchAll(inline)) targets.add(match[1] ?? "");
    const definition = reference.exec(prose)?.[1];
    if (definition !== undefined) targets.add(definition);
  }
  return targets;
}

/**
 * Every scenario id a file opens, as `?scenario=<id>` or `&scenario=<id>`,
 * outside comments, code blocks included. The id is read as far as a slug
 * could go, underscores and capitals included so a bad one is caught whole,
 * and a placeholder such as `?scenario=<id>`, `{id}` or `${id}` opens none.
 */
function scenarioUrls(text: string): string[] {
  return markdownLines(text).flatMap(({ line }) =>
    [...line.matchAll(/[?&]scenario=([A-Za-z0-9_-]*)/g)].map((match) => (match[1] ?? "").replace(/[_-]+$/, "")).filter((id) => id !== ""),
  );
}

/** What a feature file's `## Covers` section names, by kind, or the problems with it. `null` when it has none. */
export function parseCovers(file: string, text: string): { covers: Map<Kind, string[]>; problems: string[] } | null {
  const lines = proseLines(text);
  const isCovers = (line: string): boolean => /^ {0,3}##\s+Covers(?:\s+#+)?\s*$/.test(line);
  const start = lines.findIndex(isCovers);
  if (start === -1) return null;
  const covers = new Map<Kind, string[]>();
  const problems: string[] = [];
  let current: Kind | null = null;
  const named = new Set<Kind>();
  const add = (kind: Kind, spans: string[]): void => {
    if (spans.length > 0) named.add(kind);
    const found = covers.get(kind) ?? [];
    for (const span of spans) {
      if (kind === "scenarios") {
        const id = /^\?scenario=(.+)$/.exec(span)?.[1];
        if (id === undefined || !SLUG.test(id)) {
          problems.push(`${file}: the scenario ${code(span)} under ## Covers is not written as ${code("?scenario=<id>")}.`);
          continue;
        }
        found.push(id);
      } else {
        found.push(span);
      }
    }
    covers.set(kind, found);
  };
  const spansOf = (text: string): string[] => [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1] ?? "");
  for (const line of lines.slice(start + 1)) {
    if (/^ {0,3}#{1,6}(?:\s|$)/.test(line)) {
      problems.push(
        isCovers(line)
          ? `${file} has two ## Covers sections. Merge them into one, the last section of the file.`
          : `${file}: "${line.trim()}" comes after ## Covers, which must be the file's last section. Move the section above ## Covers.`,
      );
      break;
    }
    // A blank line, or a thematic break, ends no list item that matters here.
    if (line.trim() === "" || /^ {0,3}([-*_])(?: *\1){2,} *$/.test(line)) continue;
    // An indented line that is not a new item continues the item above it, as a wrapped list item does.
    if (current && /^\s+\S/.test(line) && !/^\s*[-*+]\s/.test(line)) {
      add(current, spansOf(line));
      continue;
    }
    const item = /^ {0,3}[-*+] ([^:]+):\s*(.*)$/.exec(line);
    const label = item?.[1]?.trim();
    if (!item || label === undefined || !Object.hasOwn(COVERS, label)) {
      current = null;
      problems.push(`${file}: "${line.trim()}" under ## Covers is not a "- <kind>: \`<name>\`" line. The kinds are ${Object.keys(COVERS).join(", ")}.`);
      continue;
    }
    const kind = COVERS[label as Label];
    current = kind;
    add(kind, spansOf(item[2] ?? ""));
  }
  for (const kind of covers.keys()) {
    if (!named.has(kind)) problems.push(`${file}: "- ${labelOf(kind)}:" under ## Covers names nothing. Name each in a code span.`);
  }
  if (covers.size === 0 && problems.length === 0) problems.push(`${file}: its ## Covers section lists nothing. Name what the file drives, as "- Page types: \`<id>\`" lines.`);
  return { covers: new Map([...covers].filter(([, found]) => found.length > 0)), problems: [...new Set(problems)] };
}

/** A file of the verify map, by its path inside the map: `meridian/vendor-page.md`. */
export type MapFiles = ReadonlyMap<string, string>;

/** Every problem with the verify map, held to the products the registry finds. */
export function verifyMapProblems(products: readonly ProductRegistry[], files: MapFiles): string[] {
  const problems: string[] = [];
  const byName = new Map<string, ProductRegistry>();
  for (const product of products) {
    const other = byName.get(product.name);
    if (other) problems.push(`${product.config} and ${other.config} would share the verify map folder ${VERIFY_MAP}/${product.name}/. Give one product another folder name.`);
    byName.set(product.name, product);
  }

  const folders = new Set([...files.keys()].filter((file) => file.includes("/")).map((file) => file.split("/")[0] ?? ""));
  for (const folder of [...folders].sort()) {
    if (!byName.has(folder)) problems.push(`${VERIFY_MAP}/${folder}/ is not a product's verify map: no product's config is in a folder named ${folder}. Remove it, or move it to the product's own folder name.`);
  }
  for (const file of [...files.keys()].sort()) {
    if (file.split("/").length > 2) problems.push(`${VERIFY_MAP}/${file} sits below a product's folder, where check:docs does not read it. Move it to ${VERIFY_MAP}/${file.split("/")[0]}/ and link it from that folder's README.md.`);
  }

  // The map's own pages sit at the top, each linked from its index; a page left there from before the product folders is stale.
  const top = files.get("README.md");
  const topLinks = top === undefined ? new Set<string>() : linkTargets(top);
  const allScenarios = new Set(products.flatMap((product) => product.scenarios));
  for (const [file, text] of [...files.entries()].filter(([file]) => !file.includes("/"))) {
    if (file !== "README.md" && !topLinks.has(file)) {
      problems.push(`${VERIFY_MAP}/${file} is not linked from ${VERIFY_MAP}/README.md. Move a product's recipe into its folder, or link the page from the index.`);
    }
    for (const id of scenarioUrls(text)) {
      if (!allScenarios.has(id)) problems.push(`${VERIFY_MAP}/${file} opens ${code(`?scenario=${id}`)}, which is not a scenario of any product.`);
    }
  }

  for (const product of products) {
    const prefix = `${product.name}/`;
    const own = [...files.entries()].filter(([file]) => file.startsWith(prefix) && !file.slice(prefix.length).includes("/") && file.endsWith(".md"));
    const index = files.get(`${prefix}README.md`);
    const where = `${VERIFY_MAP}/${product.name}`;
    if (index === undefined) {
      problems.push(
        `${product.config} has no verify map: add ${where}/README.md, an index that links one feature file for each part of the product, and in each feature file a ## Covers section naming what it drives (see ${VERIFY_MAP}/README.md).`,
      );
    }

    const covered = new Map<Kind, Set<string>>();
    const linked = index === undefined ? new Set<string>() : linkTargets(index);
    const features = own.filter(([file]) => file !== `${prefix}README.md`);
    for (const [file, text] of features) {
      const label = `${VERIFY_MAP}/${file}`;
      const leaf = file.slice(prefix.length);
      if (index !== undefined && !linked.has(leaf)) {
        problems.push(`${where}/README.md does not link ${leaf}. List every feature file in the index.`);
      }
      const parsed = parseCovers(label, text);
      if (parsed === null) {
        problems.push(`${label} has no ## Covers section. End it with one that names, in code spans, the page types, layouts, content layouts, tasks and scenarios it drives.`);
        continue;
      }
      problems.push(...parsed.problems);
      for (const [kind, items] of parsed.covers) {
        const set = covered.get(kind) ?? new Set<string>();
        for (const item of items) set.add(item);
        covered.set(kind, set);
      }
    }
    for (const target of [...linked].sort()) {
      if (target.endsWith(".md") && !target.includes("/") && !files.has(`${prefix}${target}`)) problems.push(`${where}/README.md links ${target}, which is not in ${where}/.`);
    }

    for (const kind of Object.values(COVERS)) {
      const registered = new Set(names(product, kind));
      const have = covered.get(kind) ?? new Set<string>();
      for (const name of registered) {
        if (!have.has(name)) {
          problems.push(
            `${product.name}'s ${SINGULAR[kind]} ${code(name)} is in no feature file of its verify map. Say how to reach and drive it in a feature file under ${where}/, and name it as ${code(written(kind, name))} on its "- ${labelOf(kind)}:" line under ## Covers.`,
          );
        }
      }
      for (const name of have) {
        if (!registered.has(name)) problems.push(`${where}/ covers the ${SINGULAR[kind]} ${code(written(kind, name))}, which ${product.name} does not have. Remove it, or name the one that replaced it.`);
      }
    }

    // A ?scenario= address anywhere in the product's map must open one of its scenarios.
    const scenarios = new Set(product.scenarios);
    for (const [file, text] of own) {
      for (const id of scenarioUrls(text)) {
        if (!scenarios.has(id)) problems.push(`${VERIFY_MAP}/${file} opens ${code(`?scenario=${id}`)}, which is not a scenario of ${product.name}.`);
      }
    }
  }
  return [...new Set(problems)];
}

function labelOf(kind: Kind): Label {
  return (Object.entries(COVERS) as [Label, Kind][]).find(([, value]) => value === kind)?.[0] ?? "Page types";
}

/** Every Markdown file of the verify map, by its path inside the map. */
export function readMapFiles(root = VERIFY_MAP): Map<string, string> {
  const files = new Map<string, string>();
  if (!existsSync(root)) return files;
  const visit = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir).sort()) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) visit(full, `${prefix}${entry}/`);
      else if (entry.endsWith(".md")) files.set(`${prefix}${entry}`, readFileSync(full, "utf8"));
    }
  };
  visit(root, "");
  return files;
}

function folders(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((entry) => statSync(path.join(dir, entry)).isDirectory())
    .sort();
}

/** What one product registers, read from its config, its folders and its flows' scenarios. */
export async function readProductRegistry(config: string): Promise<{ registry: ProductRegistry | null; problems: string[] }> {
  let parsed;
  try {
    parsed = parseConfig(readFileSync(config, "utf8"), config);
  } catch (error) {
    return { registry: null, problems: [`${config} does not parse: ${error instanceof Error ? error.message : String(error)}`] };
  }
  const shells = parsed.shells;
  const pageTypes: { id: string; kind: PageKind }[] = [
    ...Object.keys(shells?.primarySlots ?? {}).map((id) => ({ id, kind: "primary slot" as const })),
    ...Object.keys(shells?.collections ?? {}).map((id) => ({ id, kind: "collection" as const })),
    ...(shells?.content ?? []).map((id) => ({ id, kind: "content" as const })),
  ].sort((a, b) => a.id.localeCompare(b.id));
  const { scenarios, problems } = await loadScenarios(parsed.flows);
  return {
    registry: {
      name: productName(config),
      config,
      pageTypes,
      layouts: folders(parsed.paths.layouts),
      contentLayouts: folders(parsed.paths.contentLayouts),
      tasks: [...new Set(parsed.flows.flatMap((flow) => Object.keys(flow.tasks ?? {})))].sort(),
      scenarios: scenarios.map((scenario) => scenario.id),
    },
    problems: problems.map((problem) => `${config}: ${problem}`),
  };
}

function inline(items: readonly string[]): string {
  return items.length === 0 ? "none" : items.map(code).join(", ");
}

/**
 * CLAUDE.md's list: one line per product, with what it registers and its
 * verify map. Scenarios are left to the map's index, so adding one, which
 * needs no proposal, needs no edit to CLAUDE.md either.
 */
export function renderClaudeProducts(products: readonly ProductRegistry[]): string {
  return products
    .map(
      (product) =>
        `- [${code(product.name)}](${product.config}), verify map [${VERIFY_MAP}/${product.name}/](${VERIFY_MAP}/${product.name}/README.md): page types ${product.pageTypes.length === 0 ? "none" : product.pageTypes.map((pageType) => `${code(pageType.id)} (${pageType.kind})`).join(", ")}; layouts ${inline(product.layouts)}; content layouts ${inline(product.contentLayouts)}; tasks ${inline(product.tasks)}.`,
    )
    .join("\n");
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/** The verify map index's list: one line per product, linking its folder's index. */
export function renderMapProducts(products: readonly ProductRegistry[]): string {
  return products
    .map(
      (product) =>
        `- [${product.name}](${product.name}/README.md), from ${code(product.config)}: ${count(product.pageTypes.length, "page type")}, ${count(product.layouts.length, "layout")}, ${count(product.contentLayouts.length, "content layout")}, ${count(product.tasks.length, "task")} and ${count(product.scenarios.length, "scenario")}.`,
    )
    .join("\n");
}

/** The verify skill's browser drive: each Chrome rule check on each product, in `check:rules` order. */
export function renderChromeDrive(products: readonly ProductRegistry[], chromeRules: readonly string[]): string {
  const lines = products.flatMap((product) => chromeRules.map((check) => `npm run ${check} -- --config ${product.config}`));
  return ["```sh", ...lines, "```"].join("\n");
}
