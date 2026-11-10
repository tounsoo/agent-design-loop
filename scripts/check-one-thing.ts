import { existsSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { allowed_page_types } from "../src/inputs/product";
import { MAX_VISIBLE_QUESTIONS } from "../src/rules/ux-rules";
import { attributeValue, jsxTagName, listSourceFiles, parseFile, walk } from "./lib/jsx";

/**
 * One job per page. Page-type membership lives in allowed_page_types and
 * check:inventories. This check reads that inventory. It does not keep a
 * second list of page type ids.
 */

const violations: string[] = [];

type Shell = { pageType: string; name: string };

function valueExports(file: string): string[] {
  const source = parseFile(file);
  const names: string[] = [];
  walk(source, (node) => {
    if (!ts.isExportDeclaration(node) || node.isTypeOnly || !node.exportClause || !ts.isNamedExports(node.exportClause)) return;
    for (const element of node.exportClause.elements) {
      if (!element.isTypeOnly) names.push(element.name.text);
    }
  });
  return names;
}

const shells: Shell[] = [];
for (const pageType of allowed_page_types) {
  const modulePath = path.resolve("src/page-types", pageType, "index.ts");
  if (!existsSync(modulePath)) {
    violations.push(`one thing: page type "${pageType}" has no shell module.`);
    continue;
  }
  const names = valueExports(modulePath);
  if (names.length === 0) {
    violations.push(`one thing: page type "${pageType}" does not export a shell.`);
    continue;
  }
  for (const name of names) shells.push({ pageType, name });
}

const shellCounts = new Map<string, number>(shells.map((shell) => [shell.name, 0]));
const collectionShells = new Set(shells.filter((shell) => shell.pageType === "collection").map((shell) => shell.name));
const scannedLayouts = new Set<string>();

for (const file of listSourceFiles(path.resolve("src/features"))) {
  const source = parseFile(file);
  const relative = path.relative(process.cwd(), file);
  for (const shell of shells) {
    const pages = shellElements(source, shell.name);
    shellCounts.set(shell.name, (shellCounts.get(shell.name) ?? 0) + pages.length);
    if (pages.length > 1) {
      violations.push(`one thing: ${relative} renders ${pages.length} ${shell.name} shells.`);
    }
    if (!collectionShells.has(shell.name)) continue;
    for (const page of pages) {
      const primary = primaryButtons(page);
      if (primary.length > 0) {
        violations.push(`one thing: ${relative} puts a primary button on the collection page.`);
      }
      for (const layoutId of contentLayoutsIn(page, source)) {
        const dir = path.resolve("src/content-layouts", layoutId);
        if (scannedLayouts.has(dir) || !existsSync(dir)) continue;
        scannedLayouts.add(dir);
        for (const layoutFile of listSourceFiles(dir)) {
          const layoutSource = parseFile(layoutFile);
          if (primaryButtons(layoutSource).length === 0) continue;
          violations.push(
            `one thing: ${path.relative(process.cwd(), layoutFile)} puts a primary button on the collection page.`,
          );
        }
      }
    }
  }
  let visibleQuestions = 0;
  for (const fieldset of shellElements(source, "Fieldset.Root")) {
    if (!hasAncestor(fieldset, "Disclosure.Root")) visibleQuestions += 1;
  }
  if (visibleQuestions > MAX_VISIBLE_QUESTIONS) {
    violations.push(
      `one thing: ${relative} shows ${visibleQuestions} questions before disclosure (max ${MAX_VISIBLE_QUESTIONS}).`,
    );
  }
}

for (const [tag, count] of shellCounts) {
  if (count !== 1) {
    violations.push(`one thing: expected exactly one ${tag} in src/features, found ${count}.`);
  }
}

function shellElements(source: ts.SourceFile, tag: string): ts.Node[] {
  const found: ts.Node[] = [];
  walk(source, (node) => {
    const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
    if (opening && jsxTagName(opening.tagName) === tag) found.push(node);
  });
  return found;
}

function primaryButtons(root: ts.Node): ts.Node[] {
  const found: ts.Node[] = [];
  walk(root, (node) => {
    const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
    if (!opening || jsxTagName(opening.tagName) !== "Button.Root") return;
    const variant = attributeValue(opening, "variant");
    if (variant === null || variant === "primary") found.push(node);
  });
  return found;
}

function contentLayoutsIn(root: ts.Node, source: ts.SourceFile): string[] {
  const imports = new Map<string, string>();
  walk(source, (node) => {
    if (!ts.isImportDeclaration(node) || !node.importClause || !ts.isStringLiteral(node.moduleSpecifier)) return;
    const specifier = node.moduleSpecifier.text;
    const named = node.importClause.namedBindings;
    if (!named || !ts.isNamedImports(named)) return;
    for (const element of named.elements) {
      if (!element.isTypeOnly) imports.set(element.name.text, specifier);
    }
  });
  const ids: string[] = [];
  walk(root, (node) => {
    const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
    if (!opening) return;
    const rootName = jsxTagName(opening.tagName).split(".")[0] ?? "";
    const specifier = imports.get(rootName);
    const match = specifier ? /(?:^|\/)content-layouts\/([^/"']+)/.exec(specifier) : null;
    if (match?.[1]) ids.push(match[1]);
  });
  return [...new Set(ids)];
}

function hasAncestor(node: ts.Node, tag: string): boolean {
  let current = node.parent;
  while (current) {
    if (ts.isJsxElement(current) && jsxTagName(current.openingElement.tagName) === tag) return true;
    current = current.parent;
  }
  return false;
}

if (violations.length > 0) {
  for (const violation of violations) console.error(violation);
  process.exit(1);
}

console.log("one thing: one shell per page type, no primary on the collection page.");
