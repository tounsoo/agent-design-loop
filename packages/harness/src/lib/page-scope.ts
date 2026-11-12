import { existsSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { adapter } from "./adapter";
import { config, importsFrom, loadInputs, memberOf } from "./config";
import { jsxTagName, listSourceFiles, parseFile, walk } from "./jsx";
import {
  collectionShellsOf,
  primarySlotsOf,
  contentShellsOf,
  shellsOf,
  valueExports,
  type CollectionShell,
  type PrimarySlot,
  type Shell,
} from "./shells";

export { valueExports, type CollectionShell, type PrimarySlot, type Shell };

const { allowed_layouts, allowed_page_types } = await loadInputs();

/**
 * A page is one rendered page-type shell in the features path, plus everything that
 * renders on it: components the shell's JSX uses (local, or imported from a
 * relative path), the content layouts it uses, the page-type shell module, and
 * the chrome layouts that wrap every page. Caps that say "per page" count over
 * this scope, not over one file.
 */

export type Scope = {
  readonly source: ts.SourceFile;
  readonly node: ts.Node;
  /** Disclosures the scope sits inside, from the component that rendered it. */
  readonly inheritedDisclosures: number;
};

export type Page = {
  readonly file: string;
  readonly line: number;
  readonly shell: Shell;
  /** The shell element itself. */
  readonly node: ts.Node;
  readonly scopes: readonly Scope[];
};

export type PageRoots = {
  readonly pageTypes: string;
  readonly layouts: string;
  readonly contentLayouts: string;
};

export const defaultRoots: PageRoots = {
  pageTypes: path.resolve(config.paths.pageTypes),
  layouts: path.resolve(config.paths.layouts),
  contentLayouts: path.resolve(config.paths.contentLayouts),
};

const DISCLOSURE = adapter.disclosure.root;

/** Shells come from allowed_page_types. Problems are for the caller to report. */
export function discoverShells(roots: PageRoots = defaultRoots): { shells: Shell[]; problems: string[] } {
  return shellsOf(allowed_page_types, roots.pageTypes);
}

/** The primary slots the config's shells.primarySlots gives the shells. */
export function primarySlots(shells: readonly Shell[]): { slots: PrimarySlot[]; problems: string[] } {
  return primarySlotsOf(config.shells, shells, allowed_page_types);
}

/** The collection shells the config's shells.collections names. */
export function collectionShells(shells: readonly Shell[]): { collections: CollectionShell[]; problems: string[] } {
  return collectionShellsOf(config.shells, shells, allowed_page_types);
}

/** The content shells the config's shells.content names. */
export function contentShells(shells: readonly Shell[]): { content: Shell[]; problems: string[] } {
  return contentShellsOf(config.shells, shells, allowed_page_types);
}

/** Fails when a part a check counts is not a catalog export, so the cap cannot go quiet. */
export function missingCatalogParts(catalogFile: string, parts: readonly string[]): string[] {
  const exported = new Set(valueExports(catalogFile));
  return parts.filter((part) => !exported.has(part.split(".")[0] ?? part));
}

/** Local import names mapped back to the exported name: `import { Field as F }` gives F → Field. */
function aliasesOf(source: ts.SourceFile): Map<string, string> {
  const cached = aliasCache.get(source);
  if (cached) return cached;
  const aliases = new Map<string, string>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) continue;
    const named = statement.importClause.namedBindings;
    if (named && ts.isNamespaceImport(named)) aliases.set(named.name.text, NAMESPACE);
    if (!named || !ts.isNamedImports(named)) continue;
    for (const element of named.elements) {
      if (element.propertyName) aliases.set(element.name.text, element.propertyName.text);
    }
  }
  aliasCache.set(source, aliases);
  return aliases;
}
const aliasCache = new WeakMap<ts.SourceFile, Map<string, string>>();
/** Marks a namespace import, `import * as UI`, whose name is dropped from a tag: `UI.Button.Root` is `Button.Root`. */
const NAMESPACE = "\0namespace";

/** A JSX tag name as the catalog spells it, with import aliases undone. */
export function canonicalTag(opening: ts.JsxOpeningLikeElement): string {
  const tag = jsxTagName(opening.tagName);
  const [root, ...rest] = tag.split(".");
  const original = aliasesOf(opening.getSourceFile()).get(root ?? "");
  if (original === NAMESPACE) return rest.join(".");
  return original ? [original, ...rest].join(".") : tag;
}

export function openingOf(node: ts.Node): ts.JsxOpeningLikeElement | null {
  if (ts.isJsxElement(node)) return node.openingElement;
  if (ts.isJsxSelfClosingElement(node)) return node;
  return null;
}

/** Disclosure elements between node and the scope root, not counting node itself. */
export function disclosureAncestors(node: ts.Node, root: ts.Node): number {
  let count = 0;
  let current = node.parent;
  while (current && current !== root.parent) {
    if (ts.isJsxElement(current) && canonicalTag(current.openingElement) === DISCLOSURE) count += 1;
    if (current === root) break;
    current = current.parent;
  }
  return count;
}

/** Elements with the tag in the scope, with the disclosures around each. */
export function tagsInScope(scope: Scope, tag: string): { node: ts.Node; disclosures: number }[] {
  const found: { node: ts.Node; disclosures: number }[] = [];
  walk(scope.node, (node) => {
    const opening = openingOf(node);
    if (!opening || canonicalTag(opening) !== tag) return;
    found.push({ node, disclosures: scope.inheritedDisclosures + disclosureAncestors(node, scope.node) });
  });
  return found;
}

export function pagesIn(featuresRoot: string, shells: readonly Shell[], roots: PageRoots = defaultRoots): Page[] {
  const pages: Page[] = [];
  const shellNames = new Map(shells.map((shell) => [shell.name, shell]));
  for (const file of listSourceFiles(featuresRoot)) {
    const source = parseFile(file);
    walk(source, (node) => {
      const opening = openingOf(node);
      if (!opening) return;
      const shell = shellNames.get(canonicalTag(opening));
      if (!shell) return;
      pages.push({
        file: path.relative(process.cwd(), file),
        line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        shell,
        node,
        scopes: collectScopes(source, node, shell, roots),
      });
    });
  }
  return pages;
}

function collectScopes(source: ts.SourceFile, shellNode: ts.Node, shell: Shell, roots: PageRoots): Scope[] {
  const scopes: Scope[] = [];
  const wholeFiles = new Set<string>();

  const addWholeDir = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const file of listSourceFiles(dir)) {
      if (wholeFiles.has(file)) continue;
      wholeFiles.add(file);
      const whole = parseFile(file);
      scopes.push({ source: whole, node: whole, inheritedDisclosures: 0 });
    }
  };

  // Chrome layouts wrap every page. The shell's own module renders on it too.
  for (const layout of allowed_layouts) addWholeDir(path.join(roots.layouts, layout));
  addWholeDir(path.join(roots.pageTypes, shell.pageType));

  // Whole-file scopes are walked as they are. Local components inside them are
  // already counted, so only relative imports out of them are followed.
  const queue: { scope: Scope; stack: readonly ts.Node[] }[] = scopes.map((scope) => ({ scope, stack: [] }));
  // A disclosure around the shell in its own file wraps everything on the page.
  const shellScope: Scope = { source, node: shellNode, inheritedDisclosures: disclosureAncestors(shellNode, source) };
  scopes.push(shellScope);
  queue.push({ scope: shellScope, stack: [] });

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const { scope, stack } = current;
    const imports = importsOf(scope.source);
    walk(scope.node, (node) => {
      const opening = openingOf(node);
      const helperCall = ts.isCallExpression(node) && ts.isIdentifier(node.expression) ? node.expression.text : null;
      if (!opening && !helperCall) return;
      const rootName = opening ? (jsxTagName(opening.tagName).split(".")[0] ?? "") : (helperCall ?? "");
      const imported = imports.get(rootName);
      const specifier = imported?.specifier;
      const contentLayout = specifier ? memberOf(specifier, roots.contentLayouts) : null;
      if (contentLayout) {
        const before = scopes.length;
        addWholeDir(path.join(roots.contentLayouts, contentLayout));
        for (const added of scopes.slice(before)) queue.push({ scope: added, stack: [] });
        return;
      }
      if (specifier && importsFrom(specifier, roots.pageTypes)) return;
      const target = specifier
        ? importedDeclaration(scope.source.fileName, specifier, imported?.imported ?? rootName)
        : wholeFiles.has(scope.source.fileName)
          ? null
          : localDeclaration(scope.source, rootName);
      if (!target || wholeFiles.has(target.source.fileName) || stack.includes(target.node)) return;
      const child: Scope = {
        source: target.source,
        node: target.node,
        inheritedDisclosures: scope.inheritedDisclosures + disclosureAncestors(node, scope.node),
      };
      scopes.push(child);
      queue.push({ scope: child, stack: [...stack, target.node] });
    });
  }

  return scopes;
}

/** Local name → the module it comes from and the name that module exports it under. */
function importsOf(source: ts.SourceFile): Map<string, { specifier: string; imported: string }> {
  const imports = new Map<string, { specifier: string; imported: string }>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const specifier = statement.moduleSpecifier.text;
    const named = statement.importClause.namedBindings;
    if (statement.importClause.name) imports.set(statement.importClause.name.text, { specifier, imported: "default" });
    if (!named || !ts.isNamedImports(named)) continue;
    for (const element of named.elements) {
      if (!element.isTypeOnly) imports.set(element.name.text, { specifier, imported: element.propertyName?.text ?? element.name.text });
    }
  }
  return imports;
}

/** The declaration a module exports as default: `export default function`, or `export default Name`. */
function defaultDeclaration(source: ts.SourceFile): { source: ts.SourceFile; node: ts.Node } | null {
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) {
      return { source, node: statement };
    }
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      return ts.isIdentifier(statement.expression) ? localDeclaration(source, statement.expression.text) : { source, node: statement.expression };
    }
  }
  return null;
}

function localDeclaration(source: ts.SourceFile, name: string): { source: ts.SourceFile; node: ts.Node } | null {
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) return { source, node: statement };
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) return { source, node: declaration };
    }
  }
  return null;
}

function resolveModule(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, path.join(base, "index.tsx"), path.join(base, "index.ts")]) {
    if (existsSync(candidate) && statSync(candidate).isFile() && /\.tsx?$/.test(candidate)) return candidate;
  }
  return null;
}

/** Follows a relative import to the declaration, through one level of re-export. */
function importedDeclaration(
  fromFile: string,
  specifier: string,
  name: string,
  depth = 0,
): { source: ts.SourceFile; node: ts.Node } | null {
  const file = resolveModule(fromFile, specifier);
  if (!file || depth > 3) return null;
  const source = parseFile(file);
  const local = name === "default" ? defaultDeclaration(source) : localDeclaration(source, name);
  if (local) return local;
  const starred: string[] = [];
  for (const statement of source.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!statement.exportClause) {
      starred.push(statement.moduleSpecifier.text);
      continue;
    }
    if (!ts.isNamedExports(statement.exportClause)) continue;
    for (const element of statement.exportClause.elements) {
      if (element.name.text !== name) continue;
      const original = element.propertyName?.text ?? name;
      return importedDeclaration(file, statement.moduleSpecifier.text, original, depth + 1);
    }
  }
  // `export *` never re-exports a default.
  if (name === "default") return null;
  for (const specifier of starred) {
    const found = importedDeclaration(file, specifier, name, depth + 1);
    if (found) return found;
  }
  return null;
}

/** True when node sits inside one of the scopes, or is one of their roots. */
function covered(node: ts.Node, scopes: readonly Scope[]): boolean {
  const file = node.getSourceFile().fileName;
  return scopes.some((scope) => {
    if (scope.source.fileName !== file) return false;
    return node.getStart() >= scope.node.getStart() && node.getEnd() <= scope.node.getEnd();
  });
}

/**
 * Elements with the tag in the features path that no page scope reaches: JSX held
 * in a variable, built outside the shell, or in a file no page renders. A
 * per-page cap cannot count them, so the checks fail them instead.
 */
export function unreachedElements(featuresRoot: string, pages: readonly Page[], tag: string): { node: ts.Node; where: string }[] {
  const scopes = pages.flatMap((page) => page.scopes);
  const found: { node: ts.Node; where: string }[] = [];
  for (const file of listSourceFiles(featuresRoot)) {
    const source = parseFile(file);
    walk(source, (node) => {
      const opening = openingOf(node);
      if (!opening || canonicalTag(opening) !== tag || covered(node, scopes)) return;
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      found.push({ node, where: `${path.relative(process.cwd(), file)}:${line}` });
    });
  }
  return found;
}

/** Where each unreached element with the tag is, as `file:line`. */
export function unreachedTags(featuresRoot: string, pages: readonly Page[], tag: string): string[] {
  return unreachedElements(featuresRoot, pages, tag).map((found) => found.where);
}
