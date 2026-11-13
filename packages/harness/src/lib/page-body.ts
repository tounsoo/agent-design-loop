import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { adapter } from "./adapter";
import { config, memberOf, styleOwnerDirs } from "./config";
import { jsxTagName, listSourceFiles, parseFile, walk } from "./jsx";
import { canonicalTag } from "./page-scope";
import type { BodyShell } from "./shells";

/**
 * Every page's body is built from registered content layouts. A page type's
 * chrome slots, like a heading or its primary slot, hold no body; every
 * other slot does (`bodyShellsOf` in shells.ts). A body holds registered
 * content layouts and the catalog's status pieces, the adapter's
 * statusParts, which loading, empty, error and outcome messages are made of.
 * Anything else in a body (a board, a card column, a facts list or a form
 * field written in the feature, or page CSS that no registered content
 * layout uses) fails, so a new block on a page is a new content layout, and
 * a new content layout takes a proposal.
 */

const STATE_ROOTS = new Set(adapter.statusParts);

type Binding = { specifier: string; imported: string };

type Resolved = { file: string; source: ts.SourceFile; fn: ts.Node; name: string };

type Scan = {
  root: string;
  allowed: readonly string[];
  violations: string[];
  seen: Set<string>;
  /** The shell whose page is being read. */
  page: BodyShell | null;
  /** Per shell: its pages, and the slots outside its chrome that those pages fill. */
  pages: Map<string, number>;
  bodySlots: Map<string, number>;
};

/** How a message names the body being read: `collection body`, `detail body`. */
function bodyName(scan: Scan): string {
  return scan.page ? `${scan.page.shell.pageType} body` : "page body";
}

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
        `${bodyName(scan)} passes ad-hoc composition into content layout "${layout}" (${relative(file)}).`,
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
  // The tag as imported, so `import { Table as Stack }` is not read as a status part.
  if (STATE_ROOTS.has(tagRoot(canonicalTag(opening)))) {
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
  if (mode !== "state") {
    // A body, or the shell's own children outside its slots, holds content layouts and status parts as JSX, not values computed in the feature.
    scan.violations.push(`${bodyName(scan)} is not a registered content layout (${value.getText(source)} in ${relative(file)}).`);
    return;
  }
  // Text in a status part is a value, but JSX it builds, as in a map or a local const, is read like any other element in it.
  for (const element of jsxIn(value, source, new Set())) visitElement(element, mode, file, source, bindings, scan);
}

/** The outermost JSX elements an expression builds, following names to the same file's const initializers. */
function jsxIn(expression: ts.Node, source: ts.SourceFile, followed: Set<string>): ts.Node[] {
  const found: ts.Node[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      found.push(node);
      return;
    }
    if (ts.isJsxFragment(node)) {
      for (const child of node.children) visit(child);
      return;
    }
    if (ts.isIdentifier(node) && !followed.has(node.text)) {
      const declaration = localInitializer(node.text, source);
      if (declaration) {
        followed.add(node.text);
        visit(declaration);
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(expression);
  return found;
}

function localInitializer(name: string, source: ts.SourceFile): ts.Expression | null {
  let initializer: ts.Expression | null = null;
  walk(source, (node) => {
    if (initializer || !ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || node.name.text !== name) return;
    initializer = node.initializer ?? null;
  });
  return initializer;
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
  // Read the slot as the shell exports it, so `import { DetailPage as Page }` keeps its chrome and body slots.
  const tag = canonicalTag(opening);
  if (mode === "page" && scan.page) {
    if (scan.page.chrome.has(tag)) return;
    if (tag.startsWith(`${scan.page.shell.name}.`)) {
      scan.bodySlots.set(scan.page.shell.name, (scan.bodySlots.get(scan.page.shell.name) ?? 0) + 1);
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

export function bodyCompositionViolations(
  featuresDir: string,
  allowed: readonly string[],
  stylesPath: string,
  bodies: readonly BodyShell[],
): string[] {
  if (!existsSync(featuresDir)) return [`content layout features directory ${featuresDir} is missing.`];
  const files = listSourceFiles(featuresDir).filter((file) => file.endsWith(".tsx"));
  const scan: Scan = { root: featuresDir, allowed, violations: [], seen: new Set(), page: null, pages: new Map(), bodySlots: new Map() };
  const byName = new Map(bodies.map((body) => [body.shell.name, body]));
  for (const file of files) {
    const source = parseFile(file);
    const bindings = importBindings(source);
    walk(source, (node) => {
      if (!ts.isJsxElement(node)) return;
      // A shell imported under another name, or through a namespace, is still that shell.
      const body = byName.get(canonicalTag(node.openingElement));
      if (!body) return;
      scan.page = body;
      scan.pages.set(body.shell.name, (scan.pages.get(body.shell.name) ?? 0) + 1);
      for (const child of node.children) visitNode(child, "page", file, source, bindings, scan);
      scan.page = null;
    });
  }
  // A page whose every slot is chrome has no body to check, so naming the body slot as chrome would switch the rule off.
  const noBody = bodies
    .filter(({ shell }) => (scan.pages.get(shell.name) ?? 0) > 0 && (scan.bodySlots.get(shell.name) ?? 0) === 0)
    .map(({ shell, chrome }) => `${shell.name} pages fill no slot outside the chrome slots ${[...chrome].join(", ")}, so no ${shell.pageType} body is checked.`);
  return [...scan.violations, ...noBody, ...pageCssViolations(files, stylesPath)];
}
