import path from "node:path";
import ts from "typescript";
import { parseFile, walk } from "./lib/jsx";

const statesArg = process.argv.indexOf("--states");
const viewsArg = process.argv.indexOf("--views");
const statesFile =
  statesArg === -1 ? "src/flows/notification-prefs/states.ts" : (process.argv[statesArg + 1] ?? "");
const viewsFile =
  viewsArg === -1 ? "src/features/notification-settings/views.tsx" : (process.argv[viewsArg + 1] ?? "");

function exportedStringArray(file: string, name: string): string[] | null {
  const source = parseFile(path.resolve(file));
  let values: string[] | null = null;
  walk(source, (node) => {
    if (!ts.isVariableStatement(node)) return;
    const exported = node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) return;
    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name) continue;
      const initializer = declaration.initializer;
      const expression =
        initializer && ts.isAsExpression(initializer) ? initializer.expression : initializer;
      const satisfied = expression && ts.isSatisfiesExpression(expression) ? expression.expression : expression;
      if (!satisfied || !ts.isArrayLiteralExpression(satisfied)) continue;
      values = satisfied.elements.flatMap((element) => {
        const literal = ts.isAsExpression(element) ? element.expression : element;
        return ts.isStringLiteral(literal) ? [literal.text] : [];
      });
    }
  });
  return values;
}

function switchCases(file: string): Set<string> {
  const source = parseFile(path.resolve(file));
  const cases = new Set<string>();
  walk(source, (node) => {
    if (!ts.isCaseClause(node)) return;
    if (ts.isStringLiteral(node.expression)) cases.add(node.expression.text);
  });
  return cases;
}

if (!statesFile || !viewsFile) {
  console.error("state coverage: missing --states or --views path");
  process.exit(1);
}

const modeled = exportedStringArray(statesFile, "modeledStates");
if (!modeled || modeled.length === 0) {
  console.error(`state coverage: ${statesFile} does not export modeledStates`);
  process.exit(1);
}

const cases = switchCases(viewsFile);
const missing = modeled.filter((state) => !cases.has(state));
if (missing.length > 0) {
  for (const state of missing) {
    console.error(`state coverage: modeled state "${state}" has no view in ${viewsFile}`);
  }
  process.exit(1);
}

console.log(`state coverage: ${modeled.length} modeled states have views (${modeled.join(", ")}).`);
