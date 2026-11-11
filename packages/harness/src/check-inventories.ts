import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { parseAdapter, type DesignSystemAdapter } from "./lib/adapter";
import { resolveBaseRev, tryGit } from "./lib/base";
import { collectionCompositionViolations } from "./lib/collection-body";
import { config, configName, memberOf, pageTypesBarrel, parseConfig, type HarnessConfig, type ParsedConfig } from "./lib/config";
import { walk } from "./lib/jsx";
import { addingInThisChange, byBaseName, graduating, parseAll, proposalsAtRev, proposalsInDir, type Proposal } from "./lib/proposals";
import { collectionShellsOf, shellsOf } from "./lib/shells";

/**
 * Inventories are data: catalog exports, chrome layout ids, content layout
 * ids, page type ids, modeled flow states, and the mechanically checked
 * product inputs. Directory sets must match the allowlists. Membership is
 * compared to the pull request base.
 *
 * Three lists are optional in the inputs: allowed_layouts,
 * allowed_content_layouts and disclosed_sections. When the base does not
 * export one, the change may introduce it without a proposal. That is how
 * allowed_layouts and allowed_content_layouts were recorded. The other
 * arrays, allowed_page_types, tasks, priority and the flows' modeledStates,
 * must exist on the base and in the change, or the check fails. A list the
 * base already has may not change that way. Its membership changes only by
 * graduating a proposal: one that is decided on the base, that this change
 * marks graduated, and whose `changes` list what changed. A change that only
 * adds members to the catalog exports, allowed_layouts,
 * allowed_content_layouts, allowed_page_types or the flow states may instead
 * graduate a proposal this change adds, already graduated, that lists those
 * members under `adds`: proposal 0012.
 *
 * allowed_layouts is the app frame. allowed_content_layouts are the
 * compositions that fill a page type's body. A collection ready body has to
 * be one of those. Loading, empty, and error may stay in the page shell.
 *
 * A product's harness config says where each inventory lives, so it is an
 * inventory too. The base is read with its own config, at the same path as the
 * head's. A base that has the product's inputs but no config at that path is
 * read with the head's paths, and the new config is itself a change that needs
 * a graduating proposal, so renaming a config cannot skip the comparison. The
 * design system adapter the config names is an inventory as well, compared
 * field by field. A base whose config names no adapter records it once,
 * without a proposal.
 *
 * A product the base has neither the config nor the inputs of is moved or
 * new. When git sees the inputs module renamed, the check compares with the
 * base config at the old name, so a move shows as config path changes. A
 * product with no such rename is new: a whole inventory added at once, which
 * needs a graduating proposal that lists the product's directory, like any
 * other membership change. The check then records its inventories without
 * comparing them.
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

/** The working tree, read with a config, or a revision, read with its config at `config`: configName, or the path a moved product had. */
type Root = { kind: "tree"; config: ParsedConfig } | { kind: "git"; rev: string; config: string };

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
    text = execFileSync("git", ["show", `${root.rev}:${root.config}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
  const label = `${root.rev}:${root.config}`;
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

function existsAt(rev: string, file: string): boolean {
  try {
    execFileSync("git", ["cat-file", "-e", `${rev}:${file}`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** The root's inventory, or null when the root is a revision without this product: no config and no inputs. */
function readInventory(root: Root): Inventory | null {
  const own = configAt(root);
  if (own === null && root.kind === "git" && !existsAt(root.rev, config.paths.inputs)) return null;
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

/**
 * One membership change, and the terms a proposal must name to cover it: the
 * members added or removed, the task or action whose rule input changed, the
 * cap or config field. A term that lists alternatives is named when any one
 * of them is: a config path is named by its field, `paths.catalog`, or by its
 * new value. A proposal about something else does not cover it.
 *
 * `additions` is set only on a change to one of the lists that may grow in
 * one pull request, when every member in it was added and none removed. Its
 * terms are then exactly those members.
 */
type Term = string | readonly string[];
type Change = { readonly text: string; readonly terms: readonly Term[]; readonly additions?: true };

/** The inventory lists a proposal that only adds may grow in the pull request that adds it. Every other change waits for a decided proposal. */
const ADDABLE_LISTS = ["catalog exports", "allowed_layouts", "allowed_content_layouts", "allowed_page_types", "flow states"] as const;
const addableText = `${ADDABLE_LISTS.slice(0, -1).join(", ")} or ${ADDABLE_LISTS.at(-1)}`;

function differingMembers(before: readonly string[], after: readonly string[]): string[] {
  return sortedUnique([...before.filter((item) => !after.includes(item)), ...after.filter((item) => !before.includes(item))]);
}

function differingKeys<T>(before: readonly T[], after: readonly T[], key: (item: T) => string): string[] {
  const text = (items: readonly T[]) => new Map(items.map((item) => [key(item), JSON.stringify(item)]));
  const left = text(before);
  const right = text(after);
  return sortedUnique([...left.keys(), ...right.keys()].filter((name) => left.get(name) !== right.get(name)));
}

function membershipChanges(base: Inventory, head: Inventory, compareConfig: boolean): Change[] {
  const changes: Change[] = [];
  const compare = (label: string, before: unknown, after: unknown, terms: readonly Term[]) => {
    const left = JSON.stringify(before);
    const right = JSON.stringify(after);
    if (left !== right) changes.push({ text: `${label} changed from ${left} to ${right}.`, terms });
  };
  const list = (label: string, before: readonly string[], after: readonly string[]) => {
    const count = changes.length;
    compare(label, before, after, differingMembers(before, after));
    const change = changes[count];
    // A renamed or reordered member is not an addition: only a list whose every difference is a new member qualifies.
    if (change && (ADDABLE_LISTS as readonly string[]).includes(label) && before.every((member) => after.includes(member))) changes[count] = { ...change, additions: true };
  };
  // A missing list on the base is the bootstrap that records it.
  if (base.layouts !== null) list("allowed_layouts", base.layouts, head.layouts ?? []);
  if (base.contentLayouts !== null) list("allowed_content_layouts", base.contentLayouts, head.contentLayouts ?? []);
  list("allowed_page_types", base.pageTypes, head.pageTypes);
  list("catalog exports", base.catalogExports, head.catalogExports);
  list("flow states", base.flowStates, head.flowStates);
  compare("max_steps", base.maxSteps, head.maxSteps, ["max_steps", ...differingKeys(base.maxSteps, head.maxSteps, (task) => task.id)]);
  compare("priority", base.priority, head.priority, ["priority", ...differingKeys(base.priority, head.priority, (item) => item.action)]);
  if (base.disclosedSections !== null) list("disclosed_sections", base.disclosedSections, head.disclosedSections ?? []);
  compare("MAX_DISCLOSURE_DEPTH", base.disclosureDepth, head.disclosureDepth, ["MAX_DISCLOSURE_DEPTH"]);
  compare("MAX_DISCLOSURES_PER_PAGE", base.disclosuresPerPage, head.disclosuresPerPage, ["MAX_DISCLOSURES_PER_PAGE"]);
  compare("MAX_VISIBLE_QUESTIONS", base.visibleQuestions, head.visibleQuestions, ["MAX_VISIBLE_QUESTIONS"]);
  compare("TARGET_MIN_PX", base.targetMinPx, head.targetMinPx, ["TARGET_MIN_PX"]);
  // The base has the product's inputs but no config at this path: a renamed config would otherwise skip every comparison below.
  if (compareConfig && base.config === null && head.config !== null) {
    changes.push({ text: `${configName} is new: the base has no config at that path to compare.`, terms: [configName] });
  }
  if (compareConfig && base.config !== null) {
    if (head.config === null) changes.push({ text: `${configName} was removed.`, terms: [configName] });
    else {
      const keys = sortedUnique([...Object.keys(base.config.paths), ...Object.keys(head.config.paths)]);
      for (const key of keys) {
        const after = head.config.paths[key as keyof HarnessConfig["paths"]];
        const values = after === null || after === undefined ? [] : typeof after === "string" ? [after] : [];
        compare(`${configName} paths.${key}`, base.config.paths[key as keyof HarnessConfig["paths"]], after, [[`paths.${key}`, ...values]]);
      }
      const shellFields = (["primarySlots", "collections"] as const).filter(
        (field) => JSON.stringify(base.config?.shells?.[field]) !== JSON.stringify(head.config?.shells?.[field]),
      );
      compare(`${configName} shells`, base.config.shells, head.config.shells, shellFields.map((field) => `shells.${field}`));
      const flowStrings = (flows: unknown) => new Set(stringLeaves(flows));
      const baseFlows = flowStrings(base.config.flows);
      const headFlows = flowStrings(head.config.flows);
      const flowTerms = sortedUnique([...headFlows].filter((value) => !baseFlows.has(value)).concat([...baseFlows].filter((value) => !headFlows.has(value))));
      compare(`${configName} flows`, base.config.flows, head.config.flows, ["flows", ...flowTerms]);
      if (base.config.adapter !== null) {
        compare(`${configName} adapter`, base.config.adapter, head.config.adapter, [head.config.adapter ?? "adapter"]);
      }
    }
  }
  if (base.adapter !== null) {
    if (head.adapter === null) changes.push({ text: "the design system adapter was removed.", terms: ["adapter"] });
    else {
      const keys = sortedUnique([...Object.keys(base.adapter), ...Object.keys(head.adapter)]);
      for (const key of keys) {
        compare(`adapter ${key}`, base.adapter[key as keyof DesignSystemAdapter], head.adapter[key as keyof DesignSystemAdapter], [`adapter.${key}`]);
      }
    }
  }
  return changes;
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

/** Every string inside a value, keys of records included, as in a flow's module paths, task ids and preview queries. */
function stringLeaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringLeaves);
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, inner]) => [key, ...stringLeaves(inner)]);
  }
  return [];
}

function termText(term: Term): string {
  return typeof term === "string" ? `"${term}"` : term.map((option) => `"${option}"`).join(" or ");
}

/** True when the proposal's `changes` list the term, or one of its alternatives, exactly. */
function lists(proposal: Proposal, term: Term): boolean {
  const options = typeof term === "string" ? [term] : term;
  return options.some((option) => proposal.changes.includes(option));
}

/** True when the proposal's `adds` list the term, or one of its alternatives. Only a change that is all additions reads these. */
function adds(proposal: Proposal, term: Term): boolean {
  const options = typeof term === "string" ? [term] : term;
  return options.some((option) => proposal.adds.includes(option));
}

/** Every name a change's terms give, alternatives included. */
const termNames = (terms: readonly Term[]): string[] => terms.flatMap((term) => (typeof term === "string" ? [term] : [...term]));

/**
 * The proposals this change adds that only add, split by whether they may
 * cover anything here. One that lists, under `adds`, a name this change
 * removes or changes in any other way is not a proposal that only adds, so
 * it covers nothing in this product, not even the members it does add. Nor
 * does one that lists a name a proposal on the base already lists under
 * `adds`: that is a base proposal under a new file name, or a member that
 * was added before and comes back, and either goes through a decided
 * proposal.
 */
function addingProposals(changes: readonly Change[], proposals: ProposalsForChange): { usable: Proposal[]; refused: Map<string, string> } {
  const other = new Set(changes.filter((change) => !change.additions).flatMap((change) => termNames(change.terms)));
  const addedBefore = new Map([...proposals.base.values()].flatMap((proposal) => proposal.adds.map((name) => [name, proposal.file] as const)));
  const quoted = (names: readonly string[]) => names.map((name) => `"${name}"`).join(", ");
  const usable: Proposal[] = [];
  const refused = new Map<string, string>();
  for (const proposal of addingInThisChange(proposals.base, proposals.head)) {
    const changed = proposal.adds.filter((name) => other.has(name));
    const again = proposal.adds.filter((name) => addedBefore.has(name));
    if (changed.length > 0) {
      refused.set(proposal.file, `lists ${quoted(changed)} under adds, which this change removes or changes rather than adds, so it covers nothing. adds covers only members added to ${addableText}.`);
    } else if (again.length > 0) {
      const files = [...new Set(again.map((name) => addedBefore.get(name)))].join(", ");
      refused.set(
        proposal.file,
        `lists ${quoted(again)} under adds, which a proposal on the base already lists under adds (${files}), so it covers nothing. A proposal that only adds is new, and a member added before comes back through a proposal decided on the base.`,
      );
    } else usable.push(proposal);
  }
  return { usable, refused };
}

/** Why a proposal that lists every term of a change still does not cover it. */
function whyNot(file: string, change: Change, proposals: ProposalsForChange, refused: ReadonlyMap<string, string>): string {
  const key = proposals.key(file);
  const before = proposals.base.get(key);
  const after = proposals.head.get(key);
  const lists = addableText;
  if (after && after.adds.length > 0 && change.terms.some((term) => adds(after, term))) {
    if (before !== undefined && before.status !== "graduated") {
      return `${file} is ${before.status} on the base, so it cannot become a proposal that only adds. A proposal that only adds is new in the pull request that makes the addition; this one graduates only what it listed under changes when it was decided.`;
    }
    if (before !== undefined) return `${file} added its members in an earlier pull request. A proposal that only adds covers them in the pull request that adds it, once.`;
    const reason = refused.get(file);
    if (reason) return `${file} ${reason}`;
    if (!change.additions) {
      return `${file} lists it under adds, but this change does more than add members to ${lists}: ${change.text} A removal, a rename or any other change needs a proposal decided on the base.`;
    }
    return `${file} does not list every new member of this change under adds.`;
  }
  if (before === undefined) {
    return `${file} is added in this change. A proposal cannot graduate in the pull request that adds it: merge it as "status: decided" first. Only a proposal that adds members to ${lists}, and lists them under adds alone, graduates in the pull request that adds it.`;
  }
  if (before.status === "open") return `${file} is an open request on the base. A designer approves it (status: decided) in its own pull request before it graduates.`;
  if (before.status === "graduated") return `${file} graduated before. A proposal graduates once.`;
  if (after?.status !== "graduated") return `${file} is decided on the base. Mark it "status: graduated" in this change.`;
  return `${file} does not cover it.`;
}

/**
 * A membership change passes only when proposals this change graduates cover
 * it: decided on the base, marked graduated here, and listing each term of the
 * change in their `changes`, as the base has them. Two approved proposals may
 * graduate together, each covering its own term. A proposal for one change
 * does not let another through, and a proposal added in the same change
 * covers nothing, unless it only adds: then it covers the members it lists
 * under `adds` of a change that is all additions.
 */
function reportMembership(changes: readonly Change[], proposals: ProposalsForChange): boolean {
  if (changes.length === 0) return true;
  const graduates = graduating(proposals.base, proposals.head);
  const { usable, refused } = addingProposals(changes, proposals);
  const uncovered: string[] = [];
  const used = new Set<string>();
  for (const change of changes) {
    const covering = change.terms.map(
      (term) => graduates.find((proposal) => lists(proposal, term)) ?? (change.additions ? usable.find((proposal) => adds(proposal, term)) : undefined),
    );
    if (covering.every((proposal) => proposal !== undefined)) {
      const files = [...new Set(covering.map((proposal) => proposal.file))];
      for (const file of files) used.add(file);
      const named = files.map((file) =>
        usable.some((proposal) => proposal.file === file) ? `${file} (only adds, so it graduates in the pull request that adds it, which a designer reviews)` : file,
      );
      console.log(`inventory: ${change.text} Graduates ${named.join(", ")}.`);
      continue;
    }
    const candidates = [...proposals.base.values(), ...proposals.head.values()]
      .filter((proposal) => change.terms.some((term) => lists(proposal, term) || adds(proposal, term)))
      .map((proposal) => proposal.file);
    const reasons = [...new Set(candidates)].map((file) => whyNot(file, change, proposals, refused));
    const missing = change.terms.filter((term) => !graduates.some((proposal) => lists(proposal, term)));
    const none = reasons.length === 0 && graduates.length > 0 && missing.length > 0 ? `, and none graduating lists ${missing.map(termText).join(", ")}` : "";
    const orAdds = change.additions ? `, or a proposal this change adds must list ${change.terms.map(termText).join(", ")} under adds alone` : "";
    uncovered.push(
      `inventory: ${change.text} No graduating proposal covers it: a decided proposal must list ${change.terms.map(termText).join(", ")} under changes${none}${orAdds}.`,
      ...reasons.map((reason) => `inventory:   ${reason}`),
    );
  }
  if (uncovered.length > 0) {
    console.error(
      graduates.length === 0 && usable.length === 0
        ? "inventory: set changed without a proposal. An inventory grows only by graduating a proposal a designer already approved."
        : `inventory: set changed without a proposal that covers it. Graduating: ${[...graduates, ...usable].map((proposal) => proposal.file).join(", ")}.`,
    );
    for (const line of uncovered) console.error(line);
    for (const problem of proposals.problems) console.error(`inventory: ${problem}`);
    return false;
  }
  console.log(`inventory: set changed with ${[...used].sort().join(", ")}.`);
  return true;
}

function baseRev(): string {
  const base = resolveBaseRev("inventory");
  return "rev" in base ? base.rev : fail(base.problem);
}

/**
 * The base of a product moved to new file names: the base's harness config
 * whose inputs module the head's inputs were renamed from, so the move is
 * compared with what the product had rather than recorded as new. git finds
 * the rename from the base to the working tree, so a move compares the same
 * before and after it is committed.
 */
function gitBase(rev: string): Root {
  const same: Root = { kind: "git", rev, config: configName };
  if (existsAt(rev, configName) || existsAt(rev, config.paths.inputs)) return same;
  const renames = (tryGit(["diff", "--name-status", "-M", rev, "--"]) ?? "")
    .split("\n")
    .map((line) => line.split("\t"))
    .filter((fields) => fields[0]?.startsWith("R") && fields[2] === config.paths.inputs);
  const from = renames[0]?.[1];
  if (!from) return same;
  const configs = (tryGit(["ls-tree", "-r", "--name-only", rev]) ?? "").split("\n").filter((file) => path.posix.basename(file) === "harness.config.ts");
  for (const file of configs) {
    let parsed: ParsedConfig;
    try {
      parsed = parseConfig(execFileSync("git", ["show", `${rev}:${file}`], { encoding: "utf8" }), `${rev}:${file}`);
    } catch {
      continue;
    }
    if (parsed.paths.inputs !== from) continue;
    console.log(`inventory: ${configName} was ${file} at ${rev.slice(0, 7)}; comparing with that.`);
    return { kind: "git", rev, config: file };
  }
  return same;
}

function readBaseConfig(file: string): ParsedConfig {
  if (!existsSync(path.resolve(file))) fail(`inventory: base config ${file} is missing.`);
  try {
    return parseConfig(readFileSync(path.resolve(file), "utf8"), file);
  } catch (error) {
    return fail(`inventory: ${file}: ${errorText(error)}`);
  }
}

function introducedLists(base: Inventory, head: Inventory): string[] {
  const introduced: string[] = [];
  if (base.layouts === null) introduced.push("allowed_layouts");
  if (base.contentLayouts === null) introduced.push("allowed_content_layouts");
  if (base.adapter === null && head.adapter !== null) introduced.push("design system adapter");
  return introduced;
}

function summary(inventory: Inventory): string {
  const budgets = inventory.maxSteps.map((task) => `${task.id}=${task.max_steps}`).join(", ");
  const actions = inventory.priority.map((item) => item.action).join(", ");
  return `layouts ${JSON.stringify(inventory.layouts)}; content layouts ${JSON.stringify(inventory.contentLayouts)}; page types ${JSON.stringify(inventory.pageTypes)}; catalog ${inventory.catalogExports.length} exports; flow states ${JSON.stringify(inventory.flowStates)}; max_steps ${budgets}; priority ${actions}; disclosed sections ${JSON.stringify(inventory.disclosedSections)}; disclosure depth ${inventory.disclosureDepth}, per page ${inventory.disclosuresPerPage}; visible questions ${inventory.visibleQuestions}; target ${inventory.targetMinPx}px.`;
}

const baseFlag = flag("--base");
const proposalsFlag = flag("--proposals");
const baseProposalsFlag = flag("--base-proposals");
if ((proposalsFlag || baseProposalsFlag) && !baseFlag) {
  fail("inventory: --proposals and --base-proposals go with --base. They stand in for the pull request's proposals and its base's.");
}

/** The proposals on both sides of a change, parsed, with a key that lines a file up across them. */
type ProposalsForChange = {
  readonly base: ReadonlyMap<string, Proposal>;
  readonly head: ReadonlyMap<string, Proposal>;
  readonly key: (file: string) => string;
  readonly problems: readonly string[];
};

/**
 * Against a revision, the proposals in the config's `paths.proposals` at that
 * revision and in the working tree. A working-tree base has no history, so
 * `--base-proposals <dir>` and `--proposals <dir>` name the two sides, lined
 * up by file name: the fixtures test graduation that way.
 */
/** The proposals folder the base's config named, or null when the base has no config there. */
function baseProposalsDir(rev: string, file: string): string | null {
  const text = tryGit(["show", `${rev}:${file}`]);
  if (text === null) return null;
  try {
    return parseConfig(text, `${rev}:${file}`).paths.proposals;
  } catch {
    return null;
  }
}

function proposalsForChange(root: Root): ProposalsForChange {
  if (root.kind === "git") {
    // A change that moves paths.proposals graduates from the folder the base config named, so read both.
    const dirs = [...new Set([config.paths.proposals, baseProposalsDir(root.rev, root.config) ?? config.paths.proposals])];
    const base = dirs.map((dir) => parseAll(proposalsAtRev(root.rev, dir)));
    const head = dirs.map((dir) => parseAll(proposalsInDir(dir)));
    return {
      base: new Map(base.flatMap((parsed) => [...parsed.proposals])),
      head: new Map(head.flatMap((parsed) => [...parsed.proposals])),
      key: (file) => file,
      problems: head.flatMap((parsed) => parsed.problems),
    };
  }
  const read = (dir: string | null) => {
    if (dir === null) return parseAll(new Map());
    if (!existsSync(path.resolve(dir))) fail(`inventory: proposals directory ${dir} is missing.`);
    return parseAll(proposalsInDir(dir));
  };
  const base = read(baseProposalsFlag);
  const head = read(proposalsFlag);
  return { base: byBaseName(base.proposals), head: byBaseName(head.proposals), key: (file) => path.posix.basename(file), problems: head.problems };
}
const headRoot: Root = { kind: "tree", config };

const head = readInventory(headRoot);
if (!head) fail(`inventory: cannot read ${configName}.`);
if (!head.layouts) fail(`inventory: allowed_layouts is missing from ${config.paths.inputs}.`);
if (!head.contentLayouts) fail(`inventory: allowed_content_layouts is missing from ${config.paths.inputs}.`);

const collectionTypes = Object.keys(config.shells.collections);
const collectionShells = shellsOf(collectionTypes.filter((pageType) => head.pageTypes.includes(pageType)), config.paths.pageTypes);
const { collections, problems: collectionProblems } = collectionShellsOf(config.shells, collectionShells.shells, head.pageTypes);

const violations = [
  ...directoryDrift("layout", config.paths.layouts, head.layouts),
  ...directoryDrift("content layout", config.paths.contentLayouts, head.contentLayouts),
  ...directoryDrift("page type", config.paths.pageTypes, head.pageTypes),
  ...collectionShells.problems,
  ...collectionProblems,
  ...collectionCompositionViolations(path.resolve(config.paths.features), head.contentLayouts, path.resolve(config.paths.styles), collections),
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

const baseRoot: Root = baseFlag ? { kind: "tree", config: readBaseConfig(baseFlag) } : gitBase(baseRev());
const compareConfig = baseRoot.kind === "git";
const base = readInventory(baseRoot);
if (base === null) {
  if (violations.length > 0) {
    for (const violation of violations) console.error(`inventory: ${violation}`);
    process.exit(1);
  }
  const rev = baseRoot.kind === "git" ? baseRoot.rev.slice(0, 7) : baseFlag;
  // A new product is a whole inventory added at once, and so is an existing one moved to new file names, so it needs a graduating proposal like any other membership change.
  const added: Change[] = [
    { text: `base ${rev} has no ${configName} or ${config.paths.inputs}, so this is a new product.`, terms: [path.posix.dirname(configName.split(path.sep).join("/"))] },
  ];
  if (!reportMembership(added, proposalsForChange(baseRoot))) process.exit(1);
  console.log(`inventory: recorded a new product's inventories.`);
  console.log("inventory: collection bodies use a registered content layout.");
  console.log(`inventory: ${summary(head)}`);
  process.exit(0);
}
const changes = membershipChanges(base, head, compareConfig);
const matched = reportMembership(changes, proposalsForChange(baseRoot));

if (violations.length > 0 || !matched) {
  for (const violation of violations) console.error(`inventory: ${violation}`);
  process.exit(1);
}

const introduced = introducedLists(base, head);
const baseName = baseRoot.kind === "git" ? baseRoot.rev.slice(0, 7) : baseFlag;
if (introduced.length > 0) console.log(`inventory: base has no ${introduced.join(" or ")}; recorded the current inventories.`);
else console.log(`inventory: membership matches ${baseName}.`);
console.log("inventory: collection bodies use a registered content layout.");
console.log(`inventory: ${summary(head)}`);
