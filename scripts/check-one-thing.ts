import { readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { allowed_page_types } from "../src/inputs/product";
import { MAX_VISIBLE_QUESTIONS } from "../src/rules/ux-rules";
import { attributeValue, jsxElements, jsxTagName, listSourceFiles, parseFile, walk } from "./lib/jsx";

const violations: string[] = [];
const expected = ["collection", "detail"];
const allowed = [...allowed_page_types];

if (JSON.stringify(allowed) !== JSON.stringify(expected)) {
  violations.push(`one thing: allowed_page_types must be ${JSON.stringify(expected)}, found ${JSON.stringify(allowed)}.`);
}

const pageTypeDir = path.resolve("src/page-types");
const pageTypeNames = readdirSync(pageTypeDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
if (JSON.stringify(pageTypeNames) !== JSON.stringify(expected)) {
  violations.push(`one thing: page types must be ${JSON.stringify(expected)}, found ${JSON.stringify(pageTypeNames)}.`);
}

const declared = exportedStrings(path.join(pageTypeDir, "index.ts"), "pageTypes");
if (!declared || JSON.stringify(declared) !== JSON.stringify(expected)) {
  violations.push(`one thing: pageTypes must be ${JSON.stringify(expected)}, found ${JSON.stringify(declared)}.`);
}

const shellCounts = new Map<string, number>([
  ["CollectionPage", 0],
  ["DetailPage", 0],
]);
for (const file of listSourceFiles(path.resolve("src/features"))) {
  const source = parseFile(file);
  const relative = path.relative(process.cwd(), file);
  for (const tag of shellCounts.keys()) {
    const pages = jsxElements(source, tag);
    shellCounts.set(tag, (shellCounts.get(tag) ?? 0) + pages.length);
    if (pages.length > 1) {
      violations.push(`one thing: ${relative} renders ${pages.length} ${tag} shells.`);
    }
  }
  for (const page of jsxElements(source, "CollectionPage")) {
    const primary = primaryButtons(page, source);
    if (primary.length > 0) {
      violations.push(`one thing: ${relative} puts a primary button on the collection page.`);
    }
  }
  let visibleQuestions = 0;
  for (const fieldset of jsxElements(source, "Fieldset.Root")) {
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

function primaryButtons(root: ts.Node, source: ts.SourceFile): ts.Node[] {
  const found: ts.Node[] = [];
  walk(root, (node) => {
    const opening = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
        ? node
        : null;
    if (!opening || jsxTagName(opening.tagName) !== "Button.Root") return;
    const variant = attributeValue(opening, "variant");
    if (variant === null || variant === "primary") found.push(node);
  });
  void source;
  return found;
}

function hasAncestor(node: ts.Node, tag: string): boolean {
  let current = node.parent;
  while (current) {
    if (ts.isJsxElement(current) && jsxTagName(current.openingElement.tagName) === tag) return true;
    current = current.parent;
  }
  return false;
}

function exportedStrings(file: string, name: string): string[] | null {
  const source = parseFile(file);
  let values: string[] | null = null;
  const visit = (node: ts.Node) => {
    if (ts.isVariableStatement(node) && node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
      for (const declaration of node.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name || !declaration.initializer) continue;
        let expression: ts.Expression = declaration.initializer;
        while (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) expression = expression.expression;
        if (!ts.isArrayLiteralExpression(expression)) continue;
        values = expression.elements.flatMap((element) => (ts.isStringLiteral(element) ? [element.text] : []));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return values;
}

if (violations.length > 0) {
  for (const violation of violations) console.error(violation);
  process.exit(1);
}

console.log("one thing: collection and detail, one shell each, no primary on the queue.");
