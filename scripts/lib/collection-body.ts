import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { adapter } from "./adapter";
import { config, memberOf, styleOwnerDirs } from "./config";
import { jsxTagName, listSourceFiles, parseFile, walk } from "./jsx";
import type { CollectionShell } from "./shells";

/**
 * A collection is a page type the config names under shells.collections. Its
 * shell's chrome slots, like a heading, hold no body; every other slot does.
 * A collection's ready body has to be a registered content layout. Loading,
 * empty, and error may stay in the page shell: their markup is only the
 * catalog's status pieces, the adapter's statusParts. Anything else in the collection — a board, a
 * card column, page CSS that no registered content layout uses — fails.
 */

const STATE_ROOTS = new Set(adapter.statusParts);

type Binding = { specifier: string; imported: string };

type Resolved = { file: string; source: ts.SourceFile; fn: ts.Node; name: string };

type Scan = {
  root: string;
  allowed: readonly string[];
  violations: string[];
  seen: Set<string>;
  /** The collection shell whose page is being read. */
  page: CollectionShell | null;
};

function tagRoot(tag: string): string {
  const dot = tag.indexOf(".");
  return dot === -1 ? tag : tag.slice(0, dot);
}

function relative(file: string): string {
  return path.relative(process.cwd(), file);
}

function importBindings(source: ts.SourceFile): Map<string, Binding> {
  const bindings = new Map<string, Binding>();
  walk(source, (node) => {
    if (!ts.isImportDeclaration(node) || !node.importClause || !ts.isStringLiteral(node.moduleSpecifier)) return;
    const specifier = node.moduleSpecifier.text;
    if (node.importClause.name) bindings.set(node.importClause.name.text, { specifier, imported: "default" });
    const named = node.importClause.namedBindings;
    if (!named || !ts.isNamedImports(named)) return;
    for (const element of named.elements) {
      if (element.isTypeOnly) continue;
      bindings.set(element.name.text, { specifier, imported: element.propertyName?.text ?? element.name.text });
    }
  });
  return bindings;
}

function contentLayoutId(specifier: string): string | null {
  return memberOf(specifier, config.paths.contentLayouts);
}

function allowedLayoutId(tag: string, bindings: Map<string, Binding>, allowed: readonly string[]): string | null {
  const binding = bindings.get(tagRoot(tag));
  if (!binding) return null;
  const id = contentLayoutId(binding.specifier);
  if (!id || !allowed.includes(id)) return null;
  return id;
}

function openingOf(node: ts.Node): ts.JsxOpeningLikeElement | null {
  if (ts.isJsxElement(node)) return node.openingElement;
  if (ts.isJsxSelfClosingElement(node)) return node;
  return null;
}

function stringLiterals(node: ts.Node, found: string[]): void {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    if (node.text) found.push(node.text);
    return;
  }
  ts.forEachChild(node, (child) => stringLiterals(child, found));
}

function classNamesOf(opening: ts.JsxOpeningLikeElement): string[] {
  const found: string[] = [];
  for (const prop of opening.attributes.properties) {
    if (!ts.isJsxAttribute(prop) || !ts.isIdentifier(prop.name) || prop.name.text !== "className" || !prop.initializer) {
      continue;
    }
    stringLiterals(prop.initializer, found);
  }
  return found;
}

function hasNestedJsx(node: ts.Node): boolean {
  let nested = false;
  const visit = (current: ts.Node, atRoot: boolean) => {
    if (!atRoot && (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current) || ts.isJsxFragment(current))) {
      nested = true;
      return;
    }
    ts.forEachChild(current, (child) => visit(child, false));
  };
  visit(node, true);
  return nested;
}

function jsxChildNodes(node: ts.Node): readonly ts.Node[] {
  if (ts.isJsxElement(node) || ts.isJsxFragment(node)) return node.children;
  return [];
}

function findFunction(source: ts.SourceFile, name: string): ts.Node | null {
  let found: ts.Node | null = null;
  walk(source, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      found = node.initializer;
    }
  });
  return found;
}

function resolveModuleFile(fromFile: string, specifier: string): string | null {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [`${base}.tsx`, `${base}.ts`, path.join(base, "index.tsx"), path.join(base, "index.ts"), base];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function resolveComponent(
  tag: string,
  file: string,
  source: ts.SourceFile,
  bindings: Map<string, Binding>,
  root: string,
): Resolved | null {
  const name = tagRoot(tag);
  if (tag !== name) return null;
  const local = findFunction(source, name);
  if (local) return { file, source, fn: local, name };
  const binding = bindings.get(name);
  if (!binding?.specifier.startsWith(".")) return null;
  const resolved = resolveModuleFile(file, binding.specifier);
  if (!resolved) return null;
  const fromRoot = path.relative(root, resolved);
  if (fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) return null;
  const next = parseFile(resolved);
  const fn = findFunction(next, binding.imported);
  if (!fn) return null;
  return { file: resolved, source: next, fn, name: binding.imported };
}

function hasJsxElementAncestor(node: ts.Node, stop: ts.Node): boolean {
  let current = node.parent;
  while (current && current !== stop) {
    if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current)) return true;
    current = current.parent;
  }
  return false;
}

function inspectFunction(file: string, source: ts.SourceFile, fn: ts.Node, scan: Scan): void {
  const bindings = importBindings(source);
  walk(fn, (node) => {
    if (!ts.isJsxElement(node) && !ts.isJsxSelfClosingElement(node)) return;
    if (hasJsxElementAncestor(node, fn)) return;
    inspectElement(node, file, source, bindings, scan);
  });
}

function inspectElement(
  node: ts.Node,
  file: string,
  source: ts.SourceFile,
  bindings: Map<string, Binding>,
  scan: Scan,
): void {
  const opening = openingOf(node);
  if (!opening) return;
  const tag = jsxTagName(opening.tagName);
  for (const name of classNamesOf(opening)) {
    scan.violations.push(`page CSS ".${name}" is not a registered content layout (${relative(file)}).`);
  }
  const layout = allowedLayoutId(tag, bindings, scan.allowed);
  if (layout) {
    if (hasNestedJsx(node)) {
      scan.violations.push(
        `collection body passes ad-hoc composition into content layout "${layout}" (${relative(file)}).`,
      );
    }
    return;
  }
  const binding = bindings.get(tagRoot(tag));
  const attempted = binding ? contentLayoutId(binding.specifier) : null;
  if (attempted && !scan.allowed.includes(attempted)) {
    scan.violations.push(`content layout "${attempted}" is not a registered content layout (${relative(file)}).`);
    return;
  }
  if (STATE_ROOTS.has(tagRoot(tag))) {
    for (const child of jsxChildNodes(node)) visitNode(child, "state", file, source, bindings, scan);
    return;
  }
  const resolved = resolveComponent(tag, file, source, bindings, scan.root);
  if (!resolved) {
    scan.violations.push(`${tag} in ${relative(file)} is not a registered content layout.`);
    return;
  }
  const seenKey = `${resolved.file}:${resolved.name}`;
  if (scan.seen.has(seenKey)) return;
  scan.seen.add(seenKey);
  inspectFunction(resolved.file, resolved.source, resolved.fn, scan);
}

function visitExpression(
  expression: ts.Expression,
  mode: "page" | "body" | "state",
  file: string,
  source: ts.SourceFile,
  bindings: Map<string, Binding>,
  scan: Scan,
): void {
  let value: ts.Expression = expression;
  while (ts.isParenthesizedExpression(value) || ts.isAsExpression(value) || ts.isSatisfiesExpression(value)) {
    value = value.expression;
  }
  if (ts.isConditionalExpression(value)) {
    visitExpression(value.whenTrue, mode, file, source, bindings, scan);
    visitExpression(value.whenFalse, mode, file, source, bindings, scan);
    return;
  }
  if (ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    visitExpression(value.right, mode, file, source, bindings, scan);
    return;
  }
  if (
    value.kind === ts.SyntaxKind.NullKeyword ||
    value.kind === ts.SyntaxKind.TrueKeyword ||
    value.kind === ts.SyntaxKind.FalseKeyword
  ) {
    return;
  }
  if (ts.isIdentifier(value) && (value.text === "null" || value.text === "undefined")) return;
  if (ts.isJsxFragment(value)) {
    for (const child of value.children) visitNode(child, mode, file, source, bindings, scan);
    return;
  }
  if (ts.isJsxElement(value) || ts.isJsxSelfClosingElement(value)) {
    visitElement(value, mode, file, source, bindings, scan);
    return;
  }
  if (mode === "body") {
    scan.violations.push(`collection body is not a registered content layout (${value.getText(source)} in ${relative(file)}).`);
  }
}

function visitElement(
  node: ts.Node,
  mode: "page" | "body" | "state",
  file: string,
  source: ts.SourceFile,
  bindings: Map<string, Binding>,
  scan: Scan,
): void {
  const opening = openingOf(node);
  if (!opening) return;
  const tag = jsxTagName(opening.tagName);
  if (mode === "page" && scan.page) {
    if (scan.page.chrome.has(tag)) return;
    if (tag.startsWith(`${scan.page.shell.name}.`)) {
      for (const child of jsxChildNodes(node)) visitNode(child, "body", file, source, bindings, scan);
      return;
    }
  }
  inspectElement(node, file, source, bindings, scan);
}

function visitNode(
  node: ts.Node,
  mode: "page" | "body" | "state",
  file: string,
  source: ts.SourceFile,
  bindings: Map<string, Binding>,
  scan: Scan,
): void {
  if (ts.isJsxText(node)) return;
  if (ts.isJsxExpression(node)) {
    if (node.expression) visitExpression(node.expression, mode, file, source, bindings, scan);
    return;
  }
  if (ts.isJsxFragment(node)) {
    for (const child of node.children) visitNode(child, mode, file, source, bindings, scan);
    return;
  }
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) visitElement(node, mode, file, source, bindings, scan);
}

function stylesheetClasses(css: string): Set<string> {
  const found = new Set<string>();
  for (const match of css.matchAll(/\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g)) {
    const name = match[1];
    if (name) found.add(name);
  }
  return found;
}

function usedClasses(files: readonly string[]): Set<string> {
  const found = new Set<string>();
  for (const file of files) {
    if (!existsSync(file)) continue;
    const source = parseFile(file);
    walk(source, (node) => {
      const opening = openingOf(node);
      if (!opening) return;
      for (const name of classNamesOf(opening)) found.add(name);
    });
  }
  return found;
}

function pageCssViolations(featureFiles: readonly string[], stylesPath: string): string[] {
  if (!existsSync(stylesPath)) return [];
  const styled = stylesheetClasses(readFileSync(stylesPath, "utf8"));
  const used = usedClasses(featureFiles);
  const owners = styleOwnerDirs.flatMap((dir) =>
    existsSync(dir) ? listSourceFiles(path.resolve(dir)) : [],
  );
  const owned = usedClasses(owners);
  const violations: string[] = [];
  for (const name of [...used].sort()) {
    if (!styled.has(name) || owned.has(name)) continue;
    violations.push(`page CSS ".${name}" is not a registered content layout.`);
  }
  return violations;
}

export function collectionCompositionViolations(
  featuresDir: string,
  allowed: readonly string[],
  stylesPath: string,
  collections: readonly CollectionShell[],
): string[] {
  if (!existsSync(featuresDir)) return [`content layout features directory ${featuresDir} is missing.`];
  const files = listSourceFiles(featuresDir).filter((file) => file.endsWith(".tsx"));
  const scan: Scan = { root: featuresDir, allowed, violations: [], seen: new Set(), page: null };
  const byName = new Map(collections.map((collection) => [collection.shell.name, collection]));
  for (const file of files) {
    const source = parseFile(file);
    const bindings = importBindings(source);
    walk(source, (node) => {
      if (!ts.isJsxElement(node)) return;
      const collection = byName.get(jsxTagName(node.openingElement.tagName));
      if (!collection) return;
      scan.page = collection;
      for (const child of node.children) visitNode(child, "page", file, source, bindings, scan);
      scan.page = null;
    });
  }
  return [...scan.violations, ...pageCssViolations(files, stylesPath)];
}
