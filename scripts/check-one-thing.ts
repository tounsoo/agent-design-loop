import { readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { allowed_page_types } from "../src/inputs/product";
import { MAX_VISIBLE_QUESTIONS } from "../src/rules/ux-rules";
import { jsxElements, jsxTagName, listSourceFiles, parseFile } from "./lib/jsx";

const violations: string[] = [];

const allowed = [...allowed_page_types];
if (allowed.length !== 1 || allowed[0] !== "settings") {
  violations.push(`one thing: allowed_page_types must be ["settings"], found ${JSON.stringify(allowed)}.`);
}

const pageTypeDir = path.resolve("src/page-types");
const pageTypeNames = readdirSync(pageTypeDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
if (pageTypeNames.length !== 1 || pageTypeNames[0] !== "settings") {
  violations.push(`one thing: page types must be ["settings"], found ${JSON.stringify(pageTypeNames)}.`);
}

const declared = exportedStrings(path.join(pageTypeDir, "index.ts"), "pageTypes");
if (!declared || declared.length !== 1 || declared[0] !== "settings") {
  violations.push(`one thing: pageTypes must be ["settings"], found ${JSON.stringify(declared)}.`);
}

let settingsPages = 0;
for (const file of listSourceFiles(path.resolve("src/features"))) {
  const source = parseFile(file);
  const pages = jsxElements(source, "SettingsPage");
  settingsPages += pages.length;
  if (pages.length > 1) {
    violations.push(`one thing: ${path.relative(process.cwd(), file)} renders ${pages.length} settings pages.`);
  }
  let visibleQuestions = 0;
  for (const fieldset of jsxElements(source, "Fieldset.Root")) {
    if (!hasAncestor(fieldset, "Disclosure.Root")) visibleQuestions += 1;
  }
  if (visibleQuestions > MAX_VISIBLE_QUESTIONS) {
    violations.push(
      `one thing: ${path.relative(process.cwd(), file)} shows ${visibleQuestions} questions before disclosure (max ${MAX_VISIBLE_QUESTIONS}).`,
    );
  }
}

if (settingsPages !== 1) {
  violations.push(`one thing: expected exactly one SettingsPage in src/features, found ${settingsPages}.`);
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

console.log("one thing: one settings page, one visible question, no other page type.");
