import path from "node:path";
import ts from "typescript";
import { config, type FlowConfig } from "./lib/config";
import { parseFile, walk } from "./lib/jsx";

const statesArg = process.argv.indexOf("--states");
const viewsArg = process.argv.indexOf("--views");
const flows: readonly Pick<FlowConfig, "states" | "views">[] =
  statesArg === -1 && viewsArg === -1
    ? config.flows
    : [
        {
          states: statesArg === -1 ? (config.flows[0]?.states ?? "") : (process.argv[statesArg + 1] ?? ""),
          views: viewsArg === -1 ? (config.flows[0]?.views ?? "") : (process.argv[viewsArg + 1] ?? ""),
        },
      ];

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

let failed = false;

for (const { states: statesFile, views: viewsFile } of flows) {
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
    failed = true;
    continue;
  }

  console.log(`state coverage: ${modeled.length} modeled states have views (${modeled.join(", ")}).`);
}

if (failed) process.exit(1);
