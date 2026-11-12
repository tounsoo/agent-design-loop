import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { parseAdapter, type DesignSystemAdapter } from "./lib/adapter";
import { resolveBaseRev, tryGit } from "./lib/base";
import { collectionCompositionViolations } from "./lib/collection-body";
import { config, configName, memberOf, pageTypesBarrel, parseConfig, type ParsedConfig } from "./lib/config";
import { walk } from "./lib/jsx";
import { ADDABLE_LISTS, membershipChanges, type Change, type Inventory, type Term } from "./lib/membership";
import { addingInThisChange, byBaseName, adopting, parseAll, proposalsAtRev, proposalsInDir, type Proposal } from "./lib/proposals";
import { collectionShellsOf, shellsOf } from "./lib/shells";

/**
 * Inventories are data: catalog exports, chrome layout ids, content layout
 * ids, page type ids, modeled flow states, and the mechanically checked
 * product inputs. Directory sets must match the allowlists. Membership is
 * compared to the pull request base.
 *
 * Three lists may be introduced without a proposal when the base does not
 * export them: allowed_layouts, allowed_content_layouts and
 * disclosed_sections. That is how allowed_layouts and allowed_content_layouts
 * were recorded. A file exports a list when it declares it with `export const`
 * or names a local `const` in an export clause; `exportedBinding` says how
 * every other form is read, so a re-export cannot pass for a missing list. The
 * change must export allowed_layouts and allowed_content_layouts. It may leave
 * out disclosed_sections only while the base has none or an empty one, since
 * dropping members the base has is a change. The other arrays,
 * allowed_page_types, tasks, priority and the flows' modeledStates, must exist
 * on the base and in the change, or the check fails.
 *
 * lib/membership.ts compares the two sides item by item and sorts each
 * difference (proposal 2026-11-12-right-size-governance). A change that only
 * adds or only tightens may adopt a proposal this change adds, already
 * adopted, that lists it under `adds` or `tightens`; the pull request that
 * adds it is its only approval, and the code owner merges it. Everything
 * else, a removal, a rename or a loosening, adopts a proposal decided on the
 * base, marked adopted here, whose `changes` list what changed: the decision
 * lands on main first.
 *
 * allowed_layouts is the app frame. allowed_content_layouts are the
 * compositions that fill a page type's body. A collection ready body has to
 * be one of those. Loading, empty, and error may stay in the page shell.
 *
 * A product's harness config says where each inventory lives, so it is an
 * inventory too. The base is read with its own config, at the same path as the
 * head's. A base that has the product's inputs but no config at that path is
 * read with the head's paths, and the new config is itself a change that needs
 * an adopted proposal, so renaming a config cannot skip the comparison. The
 * design system adapter the config names is an inventory as well, compared
 * field by field. A base whose config names no adapter records it once,
 * without a proposal.
 *
 * A product the base has neither the config nor the inputs of is moved or
 * new. When git sees the inputs module renamed, the check compares with the
 * base's harness.config.ts whose paths.inputs names the old file, so a move
 * shows as config path changes. A product with no such rename, or whose base
 * config has another file name, is new: a whole inventory added at once, which
 * needs an adopted proposal that lists the product's directory, like any
 * other membership change. The check then records its inventories without
 * comparing them.
 *
 * `--base <config>` compares with a product in the working tree instead of
 * the pull request base. The fixtures have no history of their own, so this
 * is how they test membership. Two configs in one tree differ in their paths
 * by necessity, so the config itself is not compared then, though a new
 * page type still reads both configs' shells to tell whether it brings only
 * its own entry.
 */

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

/**
 * How a module exports `name`. Absent means no export by that name at all.
 * Present carries the expression bound to it, or null when that is not a
 * local `const` with an initializer this check can read: a `let` or `var`,
 * which can be reassigned, a destructured binding, a function, class, enum
 * or namespace, an import, or a re-export from another module.
 * `export const name = …`, `export { name }` and `export { local as name }`
 * over a local `const` all count. A module with `export * from` or
 * `export =` may export anything, so a name it does not declare itself fails
 * the check instead of reading as absent.
 */
type ExportedBinding = { readonly present: false } | { readonly present: true; readonly initializer: ts.Expression | null };

function bindingNames(name: ts.BindingName): string[] {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((element) => (ts.isOmittedExpression(element) ? [] : bindingNames(element.name)));
}

function exportedBinding(source: ts.SourceFile, name: string): ExportedBinding {
  const locals = new Map<string, ts.Expression | null>();
  let direct: { initializer: ts.Expression | null } | null = null;
  let clause: { local: string | null } | null = null;
  let opaque = false;
  for (const statement of source.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        // Only a `const` binds the value it is declared with; a `let` or `var` can be reassigned before the module exports it.
        const simple = ts.isIdentifier(declaration.name) && (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
        for (const bound of bindingNames(declaration.name)) {
          const initializer = simple && declaration.initializer ? unwrap(declaration.initializer) : null;
          locals.set(bound, initializer);
          if (bound === name && hasExport(statement)) direct = { initializer };
        }
      }
    } else if (ts.isExportDeclaration(statement)) {
      if (statement.isTypeOnly) continue;
      if (!statement.exportClause) opaque = true;
      else if (ts.isNamespaceExport(statement.exportClause)) {
        if (statement.exportClause.name.text === name) clause = { local: null };
      } else {
        for (const element of statement.exportClause.elements) {
          if (element.isTypeOnly || element.name.text !== name) continue;
          clause = { local: statement.moduleSpecifier ? null : (element.propertyName ?? element.name).text };
        }
      }
    } else if (ts.isExportAssignment(statement) && statement.isExportEquals) {
      opaque = true;
    } else if (
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement) || ts.isModuleDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) &&
      statement.name !== undefined &&
      ts.isIdentifier(statement.name) &&
      statement.name.text === name &&
      hasExport(statement) &&
      !statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
    ) {
      // A function, class, enum, namespace or `export import` exports the name at runtime, but not as a list this check can read.
      direct = { initializer: null };
    }
  }
  if (direct) return { present: true, initializer: direct.initializer };
  if (clause) return { present: true, initializer: clause.local === null ? null : (locals.get(clause.local) ?? null) };
  if (opaque) fail(`inventory: ${source.fileName} uses export * or export =, so whether it exports ${name} cannot be read. Export ${name} from this file by name.`);
  return { present: false };
}

function exportedInitializer(source: ts.SourceFile, name: string): ts.Expression | null {
  const binding = exportedBinding(source, name);
  return binding.present ? binding.initializer : null;
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
  const binding = exportedBinding(source, name);
  if (!binding.present) return null;
  return sortedUnique(stringArray(binding.initializer, name));
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
  const statesByFlow = flows.map((flow) =>
    stringArray(exportedInitializer(parseSource(flow.states, readText(root, flow.states)), "modeledStates"), "modeledStates"),
  );
  const flowStates = statesByFlow.flat();
  const previews: Record<string, string[]> = {};
  flows.forEach((flow, index) => {
    for (const state of statesByFlow[index] ?? []) previews[state] = sortedUnique([...(previews[state] ?? []), ...(flow.previews?.[state] ?? [])]);
  });
  const tasks = objectRecords(exportedInitializer(product, "tasks"), "tasks");
  const priority = objectRecords(exportedInitializer(product, "priority"), "priority");
  return {
    layouts: optionalStringArray(product, "allowed_layouts"),
    contentLayouts: optionalStringArray(product, "allowed_content_layouts"),
    pageTypes: sortedUnique(stringArray(exportedInitializer(product, "allowed_page_types"), "allowed_page_types")),
    catalogExports: catalogExports(catalog),
    flowStates: sortedUnique(flowStates),
    tasks: tasks
      .map((task) => ({
        id: requiredString(task, "id", "tasks"),
        success_state: requiredString(task, "success_state", "tasks"),
        max_steps: requiredNumber(task, "max_steps", "tasks"),
      }))
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
    previews,
    config: own,
    adapter: adapterAt(root, own),
  };
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

function termText(term: Term): string {
  return typeof term === "string" ? `"${term}"` : term.map((option) => `"${option}"`).join(" or ");
}

const quoted = (names: readonly string[]) => names.map((name) => `"${name}"`).join(", ");

/** True when the proposal's `changes` list the term, or one of its alternatives, exactly. */
function lists(proposal: Proposal, term: Term): boolean {
  const options = typeof term === "string" ? [term] : term;
  return options.some((option) => proposal.changes.includes(option));
}

/** The names a proposal lists under the field a one-pull-request change is covered by. */
const oneListed = (proposal: Proposal, kind: "adds" | "tightens"): readonly string[] => (kind === "adds" ? proposal.adds : proposal.tightens);

/** Every name a change's terms give, alternatives included. */
const termNames = (terms: readonly Term[]): string[] => terms.flatMap((term) => (typeof term === "string" ? [term] : [...term]));

/**
 * The proposals this change adds that only add or tighten, split by whether
 * they may cover anything here. One that lists, under `adds`, a name this
 * change removes or changes in any other way is not such a proposal, so it
 * covers nothing in this product, not even what it does add. Nor does one
 * that lists under `tightens` an input this change loosens. Nor does one
 * that lists under `adds` a name a proposal on the base already lists under
 * `adds` for the same list: that is a base proposal under a new file name, or
 * a member that was added before and comes back, and either goes through a
 * decided proposal. A bare name a base proposal added counts for the list
 * that holds it on the base; one that no list holds any more counts for every
 * list. `tightens` has no such rule: an input can be tightened again, each
 * time against its own base.
 */
function onePullRequestProposals(changes: readonly Change[], proposals: ProposalsForChange): { usable: Proposal[]; refused: Map<string, string> } {
  const other = new Set(changes.filter((change) => !change.kind).flatMap((change) => termNames(change.terms)));
  const notAdded = new Map(changes.filter((change) => !change.kind && change.notAddition).flatMap((change) => change.names.map((name) => [name, change.notAddition ?? ""] as const)));
  const loosened = new Map(changes.flatMap((change) => change.loosens ?? []).map((item) => [item.name, item.how]));
  const elsewhere = new Set(changes.flatMap((change) => change.elsewhere ?? []));
  const addedBefore = new Map([...proposals.base.values()].flatMap((proposal) => proposal.adds.map((name) => [name, proposal.file] as const)));
  const usable: Proposal[] = [];
  const refused = new Map<string, string>();
  for (const proposal of addingInThisChange(proposals.base, proposals.head)) {
    const changed = proposal.adds.filter((name) => other.has(name));
    const partial = proposal.adds.filter((name) => notAdded.has(name) && !other.has(name));
    const loose = proposal.tightens.filter((name) => loosened.has(name));
    const again = proposal.adds.filter((name) => addedBefore.has(name) && !elsewhere.has(name));
    if (changed.length > 0) {
      refused.set(proposal.file, `lists ${quoted(changed)} under adds, which this change removes or changes rather than adds, so it covers nothing. adds covers only what a change adds: ${ADDS_TEXT}.`);
    } else if (partial.length > 0) {
      refused.set(proposal.file, `lists ${quoted(partial)} under adds, but ${[...new Set(partial.map((name) => notAdded.get(name)))].join("; ")}, so this change does more than add and the proposal covers nothing.`);
    } else if (loose.length > 0) {
      refused.set(proposal.file, `lists ${quoted(loose)} under tightens, but ${loose.map((name) => loosened.get(name)).join(", ")} loosens it, so it covers nothing.`);
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

const ADDS_TEXT = `members of ${ADDABLE_LISTS.slice(0, -1).join(", ")} or ${ADDABLE_LISTS.at(-1)}, page-type:<id> with its own shells entry, task:<id> and preview:<state>?<query>`;
const ONE_PULL_REQUEST = "only adds or tightens, so it is adopted in the pull request that adds it, which the code owner merges";

/** Why a proposal that lists a change's terms or names still does not cover it. */
function whyNot(file: string, change: Change, proposals: ProposalsForChange, refused: ReadonlyMap<string, string>): string {
  const key = proposals.key(file);
  const before = proposals.base.get(key);
  const after = proposals.head.get(key);
  const named = (proposal: Proposal) =>
    [...change.names, ...(change.loosens ?? []).map((item) => item.name)].some((name) => proposal.adds.includes(name) || proposal.tightens.includes(name));
  // A page type, a task or a preview goes under adds by its prefixed name, so a bare name there names nothing this change adds.
  const bare = change.kind && after ? termNames(change.terms).filter((term) => oneListed(after, change.kind ?? "adds").includes(term) && !change.names.includes(term)) : [];
  if (after && bare.length > 0 && !named(after) && before === undefined) {
    return `${file} lists ${quoted(bare)} under ${change.kind}, but this change ${change.kind === "adds" ? "adds" : "tightens"} ${quoted(change.names)}: list ${change.names.length > 1 ? "those names" : "that name"} under ${change.kind}.`;
  }
  if (after && named(after)) {
    if (before !== undefined && before.status !== "adopted") {
      return `${file} is ${before.status} on the base, so it cannot become a proposal that only adds or tightens. Such a proposal is new in the pull request that makes the change; this one adopts only what it listed under changes when it was decided.`;
    }
    if (before !== undefined) return `${file} covered its change in an earlier pull request. A proposal that only adds or tightens covers it in the pull request that adds it, once.`;
    const reason = refused.get(file);
    if (reason) return `${file} ${reason}`;
    if (change.notTightening) return `${file} lists it under tightens, but ${change.notTightening}. Each input needs a proposal decided on the base.`;
    if (!change.kind) {
      return `${file} lists it under adds or tightens, but this change does more than add or tighten: ${change.text}${change.note ?? ""} A removal, a rename, a loosening or any other change needs a proposal decided on the base.`;
    }
    const missing = change.names.filter((name) => !oneListed(after, change.kind ?? "adds").includes(name));
    return `${file} does not list ${quoted(missing)} under ${change.kind}.`;
  }
  if (before === undefined) {
    return `${file} is added in this change. A proposal cannot be adopted in the pull request that adds it: merge it as "status: decided" first. Only a proposal that lists nothing but adds or tightens is adopted in the pull request that adds it.`;
  }
  if (before.status === "open") return `${file} is an open request on the base. It is decided (status: decided) in its own pull request, which the code owner merges, before it is adopted.`;
  if (before.status === "adopted") return `${file} was adopted before. A proposal is adopted once.`;
  if (after?.status !== "adopted") return `${file} is decided on the base. Mark it "status: adopted" in this change.`;
  return `${file} does not cover it.`;
}

/**
 * A membership change passes when proposals this change adopts cover it:
 * decided on the base, marked adopted here, and listing each term of the
 * change in their `changes`, as the base has them. Two decided proposals may
 * be adopted together, each covering its own term. A proposal for one change
 * does not let another through, and a proposal added in the same change
 * covers nothing, unless it only adds or tightens: then it covers a change
 * that is an addition or a tightening when it lists every one of its names
 * under that field.
 */
function reportMembership(changes: readonly Change[], proposals: ProposalsForChange): boolean {
  if (changes.length === 0) return true;
  const adopts = adopting(proposals.base, proposals.head);
  const { usable, refused } = onePullRequestProposals(changes, proposals);
  const uncovered: string[] = [];
  const used = new Set<string>();
  for (const change of changes) {
    const decided = change.terms.map((term) => adopts.find((proposal) => lists(proposal, term)));
    if (decided.every((proposal) => proposal !== undefined)) {
      const files = [...new Set(decided.map((proposal) => proposal.file))];
      for (const file of files) used.add(file);
      console.log(`inventory: ${change.text} Adopts ${files.join(", ")}.`);
      continue;
    }
    const kind = change.kind;
    const one = kind ? change.names.map((name) => usable.find((proposal) => oneListed(proposal, kind).includes(name))) : [];
    if (kind && change.names.length > 0 && one.every((proposal) => proposal !== undefined)) {
      const files = [...new Set(one.map((proposal) => proposal.file))];
      for (const file of files) used.add(file);
      console.log(`inventory: ${change.text} Adopts ${files.map((file) => `${file} (${ONE_PULL_REQUEST})`).join(", ")}.`);
      continue;
    }
    const candidates = [...proposals.base.values(), ...proposals.head.values()]
      .filter(
        (proposal) =>
          change.terms.some((term) => lists(proposal, term)) ||
          (change.kind !== undefined && termNames(change.terms).some((term) => oneListed(proposal, change.kind ?? "adds").includes(term) && !change.names.includes(term))) ||
          [...change.names, ...(change.loosens ?? []).map((item) => item.name)].some((name) => proposal.adds.includes(name) || proposal.tightens.includes(name)),
      )
      .map((proposal) => proposal.file);
    const reasons = [...new Set(candidates)].map((file) => whyNot(file, change, proposals, refused));
    const missing = change.terms.filter((term) => !adopts.some((proposal) => lists(proposal, term)));
    const none = reasons.length === 0 && adopts.length > 0 && missing.length > 0 ? `, and no adopted proposal lists ${missing.map(termText).join(", ")}` : "";
    const orOne = kind && change.names.length > 0 ? `, or a proposal this change adds must list ${quoted(change.names)} under ${kind}, with nothing under changes, retires or opts-out` : "";
    uncovered.push(
      `inventory: ${change.text} No adopted proposal covers it: a decided proposal must list ${change.terms.map(termText).join(", ")} under changes${none}${orOne}.${change.note ?? ""}`,
      ...reasons.map((reason) => `inventory:   ${reason}`),
    );
  }
  if (uncovered.length > 0) {
    console.error(
      adopts.length === 0 && usable.length === 0
        ? "inventory: set changed without a proposal. An inventory changes only by adopting a proposal decided on the base, or one this change adds that only adds or tightens."
        : `inventory: set changed without a proposal that covers it. Adopting: ${[...adopts, ...usable].map((proposal) => proposal.file).join(", ")}.`,
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
  const budgets = inventory.tasks.map((task) => `${task.id}=${task.max_steps}`).join(", ");
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
 * up by file name: the fixtures test adoption that way.
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
    // A change that moves paths.proposals adopts from the folder the base config named, so read both.
    const dirs = [...new Set([config.paths.proposals, baseProposalsDir(root.rev, root.config) ?? config.paths.proposals])];
    const base = dirs.map((dir) => parseAll(proposalsAtRev(root.rev, dir), { base: true }));
    const head = dirs.map((dir) => parseAll(proposalsInDir(dir)));
    return {
      base: new Map(base.flatMap((parsed) => [...parsed.proposals])),
      head: new Map(head.flatMap((parsed) => [...parsed.proposals])),
      key: (file) => file,
      problems: head.flatMap((parsed) => parsed.problems),
    };
  }
  const read = (dir: string | null, options: { base?: boolean } = {}) => {
    if (dir === null) return parseAll(new Map());
    if (!existsSync(path.resolve(dir))) fail(`inventory: proposals directory ${dir} is missing.`);
    return parseAll(proposalsInDir(dir), options);
  };
  const base = read(baseProposalsFlag, { base: true });
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
  // A new product is a whole inventory added at once, and so is an existing one moved to new file names, so it needs an adopted proposal like any other membership change.
  const added: Change[] = [
    { text: `base ${rev} has no ${configName} or ${config.paths.inputs}, so this is a new product.`, terms: [path.posix.dirname(configName.split(path.sep).join("/"))], names: [] },
  ];
  if (!reportMembership(added, proposalsForChange(baseRoot))) process.exit(1);
  console.log(`inventory: recorded a new product's inventories.`);
  console.log("inventory: collection bodies use a registered content layout.");
  console.log(`inventory: ${summary(head)}`);
  process.exit(0);
}
const changes = membershipChanges(base, head, compareConfig, configName);
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
