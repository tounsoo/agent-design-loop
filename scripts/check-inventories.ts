import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { parseAdapter, type DesignSystemAdapter } from "./lib/adapter";
import { collectionCompositionViolations } from "./lib/collection-body";
import { config, configName, memberOf, pageTypesBarrel, parseConfig, type HarnessConfig, type ParsedConfig } from "./lib/config";
import { walk } from "./lib/jsx";

/**
 * Inventories are data: catalog exports, chrome layout ids, content layout
 * ids, page type ids, modeled flow states, and the mechanically checked
 * product inputs. Directory sets must match the allowlists. Membership is
 * compared to the pull request base.
 *
 * A list the base does not export may be introduced. That is how allowed_layouts
 * was recorded, and how allowed_content_layouts is recorded. It may not change
 * a set the base already had. After a list exists, a membership change needs
 * a new proposal file with a reason, a preview, and a graduation.
 *
 * allowed_layouts is the app frame. allowed_content_layouts are the
 * compositions that fill a page type's body. A collection ready body has to
 * be one of those. Loading, empty, and error may stay in the page shell.
 *
 * harness.config.ts says where each inventory lives, so it is an inventory
 * too. The base is read with its own config, at the same path as the head's.
 * A base without one is read with the head's paths, once: the pull request
 * that records the config. The design system adapter the config names is an
 * inventory as well, compared field by field. A base whose config names no
 * adapter records it once.
 *
 * `--base <config>` compares with a product in the working tree instead of
 * the pull request base. The fixtures have no history of their own, so this
 * is how they test membership. Two configs in one tree differ in their paths
 * by necessity, so the config itself is not compared then.
 */

type StepBudget = { id: string; max_steps: number };
type PriorityItem = { action: string; rank: number; level: string };

type Inventory = {
  layouts: string[] | null;
  contentLayouts: string[] | null;
  pageTypes: string[];
  catalogExports: string[];
  flowStates: string[];
  maxSteps: StepBudget[];
  priority: PriorityItem[];
  disclosedSections: string[] | null;
  disclosureDepth: number;
  disclosuresPerPage: number;
  visibleQuestions: number;
  targetMinPx: number;
  /** The root's own harness config, or null when the root has none. */
  config: ParsedConfig | null;
  /** The adapter the root's config names, or null when it names none. */
  adapter: DesignSystemAdapter | null;
};

/** The working tree, read with a config, or a revision, read with the config at configName. */
type Root = { kind: "tree"; config: ParsedConfig } | { kind: "git"; rev: string };

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function flag(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) fail(`inventory: missing ${name} path`);
  return value;
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isAsExpression(current) || ts.isSatisfiesExpression(current) || ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

function hasExport(node: { modifiers?: ts.NodeArray<ts.ModifierLike> }): boolean {
  return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function parseSource(fileName: string, text: string): ts.SourceFile {
  const kind = fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind);
}

function readText(root: Root, file: string): string {
  if (root.kind === "tree") {
    if (!existsSync(path.resolve(file))) fail(`inventory: missing ${file}.`);
    return readFileSync(path.resolve(file), "utf8");
  }
  try {
    return execFileSync("git", ["show", `${root.rev}:${file}`], { encoding: "utf8" });
  } catch {
    return fail(`inventory: base ${root.rev} is missing ${file}.`);
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function configAt(root: Root): ParsedConfig | null {
  if (root.kind === "tree") return root.config;
  let text: string;
  try {
    text = execFileSync("git", ["show", `${root.rev}:${configName}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
  const label = `${root.rev}:${configName}`;
  try {
    return parseConfig(text, label);
  } catch (error) {
    return fail(`inventory: ${label}: ${errorText(error)}`);
  }
}

function adapterAt(root: Root, own: ParsedConfig | null): DesignSystemAdapter | null {
  if (own?.adapter == null) return null;
  const label = root.kind === "tree" ? own.adapter : `${root.rev}:${own.adapter}`;
  try {
    return parseAdapter(readText(root, own.adapter), label);
  } catch (error) {
    return fail(`inventory: ${label}: ${errorText(error)}`);
  }
}

function exportedInitializer(source: ts.SourceFile, name: string): ts.Expression | null {
  let found: ts.Expression | null = null;
  walk(source, (node) => {
    if (!ts.isVariableStatement(node) || !hasExport(node)) return;
    for (const declaration of node.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name && declaration.initializer) {
        found = unwrap(declaration.initializer);
      }
    }
  });
  return found;
}

function stringArray(expression: ts.Expression | null, label: string): string[] {
  if (!expression || !ts.isArrayLiteralExpression(expression)) fail(`inventory: ${label} is not a string array.`);
  const values: string[] = [];
  for (const element of expression.elements) {
    const value = unwrap(element);
    if (!ts.isStringLiteral(value)) fail(`inventory: ${label} must be string literals.`);
    values.push(value.text);
  }
  return values;
}

function optionalStringArray(source: ts.SourceFile, name: string): string[] | null {
  let present = false;
  walk(source, (node) => {
    if (!ts.isVariableStatement(node) || !hasExport(node)) return;
    for (const declaration of node.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) present = true;
    }
  });
  if (!present) return null;
  return sortedUnique(stringArray(exportedInitializer(source, name), name));
}

function objectRecords(expression: ts.Expression | null, label: string): Map<string, string | number>[] {
  if (!expression || !ts.isArrayLiteralExpression(expression)) fail(`inventory: ${label} is not an array.`);
  return expression.elements.map((element) => {
    const value = unwrap(element);
    if (!ts.isObjectLiteralExpression(value)) fail(`inventory: ${label} entries must be object literals.`);
    const record = new Map<string, string | number>();
    for (const property of value.properties) {
      if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) {
        fail(`inventory: ${label} entries must use identifier properties.`);
      }
      const initializer = unwrap(property.initializer);
      if (ts.isStringLiteral(initializer)) record.set(property.name.text, initializer.text);
      else if (ts.isNumericLiteral(initializer)) record.set(property.name.text, finiteNumber(initializer, `${label}.${property.name.text}`));
      else fail(`inventory: ${label}.${property.name.text} must be a string or number literal.`);
    }
    return record;
  });
}

function requiredString(record: Map<string, string | number>, key: string, label: string): string {
  const value = record.get(key);
  if (typeof value !== "string") fail(`inventory: ${label} is missing ${key}.`);
  return value;
}

function requiredNumber(record: Map<string, string | number>, key: string, label: string): number {
  const value = record.get(key);
  if (typeof value !== "number") fail(`inventory: ${label} is missing ${key}.`);
  return value;
}

function finiteNumber(node: ts.NumericLiteral, label: string): number {
  const value = Number(node.text.replace(/_/g, ""));
  if (!Number.isFinite(value)) fail(`inventory: ${label} is not a finite number.`);
  return value;
}

function exportedNumber(source: ts.SourceFile, name: string): number {
  const initializer = exportedInitializer(source, name);
  if (!initializer || !ts.isNumericLiteral(initializer)) fail(`inventory: ${name} is not a number.`);
  return finiteNumber(initializer, name);
}

function catalogExports(source: ts.SourceFile): string[] {
  const names: string[] = [];
  walk(source, (node) => {
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) names.push(element.name.text);
      return;
    }
    if (ts.isExportAssignment(node)) {
      names.push("default");
      return;
    }
    if (ts.isVariableStatement(node) && hasExport(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text);
      }
      return;
    }
    if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isTypeAliasDeclaration(node)) && hasExport(node)) {
      names.push(node.name?.text ?? "default");
    }
  });
  return sortedUnique(names);
}

function readInventory(root: Root): Inventory {
  const own = configAt(root);
  const { paths, flows } = own ?? config;
  const product = parseSource(paths.inputs, readText(root, paths.inputs));
  const rules = parseSource(paths.rules, readText(root, paths.rules));
  const catalog = parseSource(paths.catalog, readText(root, paths.catalog));
  const flowStates = flows.flatMap((flow) =>
    stringArray(exportedInitializer(parseSource(flow.states, readText(root, flow.states)), "modeledStates"), "modeledStates"),
  );
  const tasks = objectRecords(exportedInitializer(product, "tasks"), "tasks");
  const priority = objectRecords(exportedInitializer(product, "priority"), "priority");
  return {
    layouts: optionalStringArray(product, "allowed_layouts"),
    contentLayouts: optionalStringArray(product, "allowed_content_layouts"),
    pageTypes: sortedUnique(stringArray(exportedInitializer(product, "allowed_page_types"), "allowed_page_types")),
    catalogExports: catalogExports(catalog),
    flowStates: sortedUnique(flowStates),
    maxSteps: tasks
      .map((task) => ({ id: requiredString(task, "id", "tasks"), max_steps: requiredNumber(task, "max_steps", "tasks") }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    priority: priority
      .map((item) => ({
        action: requiredString(item, "action", "priority"),
        rank: requiredNumber(item, "rank", "priority"),
        level: requiredString(item, "level", "priority"),
      }))
      .sort((left, right) => left.rank - right.rank || left.action.localeCompare(right.action)),
    disclosedSections: optionalStringArray(product, "disclosed_sections"),
    disclosureDepth: exportedNumber(rules, "MAX_DISCLOSURE_DEPTH"),
    disclosuresPerPage: exportedNumber(rules, "MAX_DISCLOSURES_PER_PAGE"),
    visibleQuestions: exportedNumber(rules, "MAX_VISIBLE_QUESTIONS"),
    targetMinPx: exportedNumber(rules, "TARGET_MIN_PX"),
    config: own,
    adapter: adapterAt(root, own),
  };
}

function membershipChanges(base: Inventory, head: Inventory, compareConfig: boolean): string[] {
  const lines: string[] = [];
  const compare = (label: string, before: unknown, after: unknown) => {
    const left = JSON.stringify(before);
    const right = JSON.stringify(after);
    if (left !== right) lines.push(`${label} changed from ${left} to ${right}.`);
  };
  // A missing list on the base is the bootstrap that records it.
  if (base.layouts !== null) compare("allowed_layouts", base.layouts, head.layouts);
  if (base.contentLayouts !== null) compare("allowed_content_layouts", base.contentLayouts, head.contentLayouts);
  compare("allowed_page_types", base.pageTypes, head.pageTypes);
  compare("catalog exports", base.catalogExports, head.catalogExports);
  compare("flow states", base.flowStates, head.flowStates);
  compare("max_steps", base.maxSteps, head.maxSteps);
  compare("priority", base.priority, head.priority);
  if (base.disclosedSections !== null) compare("disclosed_sections", base.disclosedSections, head.disclosedSections);
  compare("MAX_DISCLOSURE_DEPTH", base.disclosureDepth, head.disclosureDepth);
  compare("MAX_DISCLOSURES_PER_PAGE", base.disclosuresPerPage, head.disclosuresPerPage);
  compare("MAX_VISIBLE_QUESTIONS", base.visibleQuestions, head.visibleQuestions);
  compare("TARGET_MIN_PX", base.targetMinPx, head.targetMinPx);
  if (compareConfig && base.config !== null) {
    if (head.config === null) lines.push(`${configName} was removed.`);
    else {
      const keys = sortedUnique([...Object.keys(base.config.paths), ...Object.keys(head.config.paths)]);
      for (const key of keys) {
        compare(`${configName} paths.${key}`, base.config.paths[key as keyof HarnessConfig["paths"]], head.config.paths[key as keyof HarnessConfig["paths"]]);
      }
      compare(`${configName} flows`, base.config.flows, head.config.flows);
      if (base.config.adapter !== null) compare(`${configName} adapter`, base.config.adapter, head.config.adapter);
    }
  }
  if (base.adapter !== null) {
    if (head.adapter === null) lines.push("the design system adapter was removed.");
    else {
      const keys = sortedUnique([...Object.keys(base.adapter), ...Object.keys(head.adapter)]);
      for (const key of keys) {
        compare(`adapter ${key}`, base.adapter[key as keyof DesignSystemAdapter], head.adapter[key as keyof DesignSystemAdapter]);
      }
    }
  }
  return lines;
}

function childDirectories(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function directoryDrift(kind: "layout" | "content layout" | "page type", dir: string, allowed: readonly string[]): string[] {
  const absolute = path.resolve(dir);
  if (!existsSync(absolute)) return [`allowed ${kind} directory ${dir} is missing.`];
  const found = childDirectories(absolute);
  const violations: string[] = [];
  for (const name of found) {
    if (!allowed.includes(name)) violations.push(`undeclared ${kind} "${name}" is not in the inventory.`);
  }
  for (const name of [...allowed].sort()) {
    if (!found.includes(name)) violations.push(`allowed ${kind} "${name}" has no directory in ${dir}.`);
  }
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name === "index.ts") continue;
    violations.push(`undeclared ${kind} file "${entry.name}" is not in the inventory.`);
  }
  return violations;
}

function listTypeScript(root: string): string[] {
  const files: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (/\.tsx?$/.test(entry.name)) files.push(full);
    }
  };
  visit(root);
  return files;
}

function importedMembers(root: string, inventoryDir: string): string[] {
  const ids: string[] = [];
  for (const file of listTypeScript(root)) {
    const source = parseSource(file, readFileSync(file, "utf8"));
    walk(source, (node) => {
      const specifier =
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
          ? node.moduleSpecifier.text
          : null;
      if (!specifier) return;
      const id = memberOf(specifier, inventoryDir);
      if (id) ids.push(id);
    });
  }
  return sortedUnique(ids);
}

function barrelMembers(file: string): string[] {
  if (!existsSync(file)) return [];
  const source = parseSource(file, readFileSync(file, "utf8"));
  const ids: string[] = [];
  walk(source, (node) => {
    const specifier =
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
        ? node.moduleSpecifier.text
        : null;
    const match = specifier ? /^\.\/([^/.]+)/.exec(specifier) : null;
    if (match?.[1]) ids.push(match[1]);
  });
  return sortedUnique(ids);
}

function isProposal(file: string): boolean {
  const normalized = file.split(path.sep).join("/");
  return normalized.startsWith("proposals/") && normalized.endsWith(".md") && normalized !== "proposals/README.md";
}

function proposalsOnDisk(dir: string): Map<string, string> {
  const root = path.join(dir, "proposals");
  const files = new Map<string, string>();
  if (!existsSync(root)) return files;
  const visit = (current: string, relative: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const next = `${relative}/${entry.name}`;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) visit(full, next);
      else if (isProposal(next)) files.set(next, readFileSync(full, "utf8"));
    }
  };
  visit(root, "proposals");
  return files;
}

function proposalNamesAtRev(rev: string): Set<string> {
  try {
    const output = execFileSync("git", ["ls-tree", "-r", "--name-only", rev, "proposals"], { encoding: "utf8" });
    return new Set(
      output
        .split("\n")
        .map((line) => line.trim())
        .filter(isProposal),
    );
  } catch {
    return new Set();
  }
}

function proposalExplains(text: string): boolean {
  const body = text.toLowerCase();
  return body.includes("reason") && body.includes("preview") && body.includes("graduation");
}

function explainingProposals(baseNames: Set<string>, head: Map<string, string>): string[] {
  const added: string[] = [];
  for (const [file, text] of head) {
    if (!baseNames.has(file) && proposalExplains(text)) added.push(file);
  }
  return added.sort();
}

function reportMembership(changes: string[], explained: readonly string[]): boolean {
  if (changes.length === 0) return true;
  if (explained.length === 0) {
    console.error("inventory: set changed without a proposal.");
    for (const change of changes) console.error(`inventory: ${change}`);
    return false;
  }
  console.log(`inventory: set changed with ${explained.join(", ")}.`);
  for (const change of changes) console.log(`inventory: ${change}`);
  return true;
}

function tryGit(args: string[]): string | null {
  try {
    return execFileSync("git", args, { encoding: "utf8" });
  } catch {
    return null;
  }
}

function assertSafeRev(rev: string): void {
  if (!/^[A-Za-z0-9._/^~-]+$/.test(rev) || rev.startsWith("-")) fail(`inventory: refusing base rev "${rev}".`);
}

function resolveBaseRev(): string {
  const fromEnv = process.env.INVENTORY_BASE?.trim();
  if (fromEnv && fromEnv !== "true" && fromEnv !== "false" && !/^0+$/.test(fromEnv)) {
    assertSafeRev(fromEnv);
    if (!tryGit(["rev-parse", "--verify", "--quiet", `${fromEnv}^{commit}`])) {
      fail(`inventory: base rev ${fromEnv} is not in this clone. Fetch the pull request base.`);
    }
    return fromEnv;
  }
  const main = ["origin/main", "main"].find((rev) => tryGit(["rev-parse", "--verify", "--quiet", `${rev}^{commit}`]));
  if (!main) fail("inventory: cannot find main. Fetch the pull request base.");
  const head = tryGit(["rev-parse", "HEAD"])?.trim();
  const mainSha = tryGit(["rev-parse", main])?.trim();
  if (!head || !mainSha) fail("inventory: cannot resolve HEAD.");
  if (head === mainSha) return mainSha;
  return tryGit(["merge-base", "HEAD", main])?.trim() || fail("inventory: cannot resolve the pull request base.");
}

function readBaseConfig(file: string): ParsedConfig {
  if (!existsSync(path.resolve(file))) fail(`inventory: base config ${file} is missing.`);
  try {
    return parseConfig(readFileSync(path.resolve(file), "utf8"), file);
  } catch (error) {
    return fail(`inventory: ${file}: ${errorText(error)}`);
  }
}

function introducedLists(base: Inventory, head: Inventory, compareConfig: boolean): string[] {
  const introduced: string[] = [];
  if (base.layouts === null) introduced.push("allowed_layouts");
  if (base.contentLayouts === null) introduced.push("allowed_content_layouts");
  if (compareConfig && base.config === null && head.config !== null) introduced.push(configName);
  if (base.adapter === null && head.adapter !== null) introduced.push("design system adapter");
  return introduced;
}

function summary(inventory: Inventory): string {
  const budgets = inventory.maxSteps.map((task) => `${task.id}=${task.max_steps}`).join(", ");
  const actions = inventory.priority.map((item) => item.action).join(", ");
  return `layouts ${JSON.stringify(inventory.layouts)}; content layouts ${JSON.stringify(inventory.contentLayouts)}; page types ${JSON.stringify(inventory.pageTypes)}; catalog ${inventory.catalogExports.length} exports; flow states ${JSON.stringify(inventory.flowStates)}; max_steps ${budgets}; priority ${actions}; disclosed sections ${JSON.stringify(inventory.disclosedSections)}; disclosure depth ${inventory.disclosureDepth}, per page ${inventory.disclosuresPerPage}; visible questions ${inventory.visibleQuestions}; target ${inventory.targetMinPx}px.`;
}

const baseFlag = flag("--base");
const headRoot: Root = { kind: "tree", config };

const head = readInventory(headRoot);
if (!head.layouts) fail(`inventory: allowed_layouts is missing from ${config.paths.inputs}.`);
if (!head.contentLayouts) fail(`inventory: allowed_content_layouts is missing from ${config.paths.inputs}.`);

const violations = [
  ...directoryDrift("layout", config.paths.layouts, head.layouts),
  ...directoryDrift("content layout", config.paths.contentLayouts, head.contentLayouts),
  ...directoryDrift("page type", config.paths.pageTypes, head.pageTypes),
  ...collectionCompositionViolations(path.resolve(config.paths.features), head.contentLayouts, path.resolve(config.paths.styles)),
];

const declaredPages = sortedUnique(stringArray(exportedInitializer(parseSource(pageTypesBarrel, readText(headRoot, pageTypesBarrel)), "pageTypes"), "pageTypes"));
if (JSON.stringify(declaredPages) !== JSON.stringify(head.pageTypes)) {
  violations.push(`pageTypes ${JSON.stringify(declaredPages)} drifted from allowed_page_types ${JSON.stringify(head.pageTypes)}.`);
}

for (const id of barrelMembers(path.resolve(pageTypesBarrel))) {
  if (!head.pageTypes.includes(id)) violations.push(`undeclared page type "${id}" is not in the inventory.`);
}

const sourceRoot = path.resolve(config.paths.source);
for (const id of importedMembers(sourceRoot, config.paths.layouts)) {
  if (!head.layouts.includes(id)) violations.push(`undeclared layout "${id}" is not in the inventory.`);
}
for (const id of importedMembers(sourceRoot, config.paths.contentLayouts)) {
  if (!head.contentLayouts.includes(id)) violations.push(`undeclared content layout "${id}" is not in the inventory.`);
}
for (const id of importedMembers(sourceRoot, config.paths.pageTypes)) {
  if (!head.pageTypes.includes(id)) violations.push(`undeclared page type "${id}" is not in the inventory.`);
}

const baseRoot: Root = baseFlag ? { kind: "tree", config: readBaseConfig(baseFlag) } : { kind: "git", rev: resolveBaseRev() };
const compareConfig = baseRoot.kind === "git";
const base = readInventory(baseRoot);
const changes = membershipChanges(base, head, compareConfig);
// A working-tree base shares the head's proposals, so it can add none.
const explained = baseRoot.kind === "git" ? explainingProposals(proposalNamesAtRev(baseRoot.rev), proposalsOnDisk(process.cwd())) : [];
const matched = reportMembership(changes, explained);

if (violations.length > 0 || !matched) {
  for (const violation of violations) console.error(`inventory: ${violation}`);
  process.exit(1);
}

const introduced = introducedLists(base, head, compareConfig);
const baseName = baseRoot.kind === "git" ? baseRoot.rev.slice(0, 7) : baseFlag;
if (introduced.length > 0) console.log(`inventory: base has no ${introduced.join(" or ")}; recorded the current inventories.`);
else console.log(`inventory: membership matches ${baseName}.`);
console.log(`inventory: ${summary(head)}`);
