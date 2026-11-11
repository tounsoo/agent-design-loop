import path from "node:path";
import ts from "typescript";
import { adapter, isPrimaryVariant } from "./lib/adapter";
import { config } from "./lib/config";
import { attributeValue, elementText, jsxElements, jsxTagName, lineOf, listSourceFiles, parseFile, walk } from "./lib/jsx";

const rootArg = process.argv.indexOf("--root");
const roots = rootArg === -1 ? [config.paths.features] : [process.argv[rootArg + 1] ?? ""];

type ButtonHit = {
  line: number;
  variant: string | null | "dynamic";
  text: string;
};

function buttonsIn(node: ts.Node, source: ts.SourceFile): ButtonHit[] {
  const hits: ButtonHit[] = [];
  walk(node, (current) => {
    const opening = ts.isJsxElement(current)
      ? current.openingElement
      : ts.isJsxSelfClosingElement(current)
        ? current
        : null;
    if (!opening || jsxTagName(opening.tagName) !== adapter.action.tag) return;
    hits.push({
      line: lineOf(source, opening),
      variant: attributeValue(opening, adapter.action.variantProp),
      text: elementText(current).text,
    });
  });
  return hits;
}

const violations: string[] = [];
let pages = 0;

for (const root of roots) {
  if (!root) {
    console.error("primary slot: missing --root path");
    process.exit(1);
  }
  const absolute = path.resolve(root);
  const files =
    absolute.endsWith(".ts") || absolute.endsWith(".tsx") ? [absolute] : listSourceFiles(absolute);
  for (const file of files) {
    const source = parseFile(file);
    const relative = path.relative(process.cwd(), file);
    const detailPages = jsxElements(source, "DetailPage");
    walk(source, (node) => {
      if (ts.isJsxSelfClosingElement(node) && jsxTagName(node.tagName) === "DetailPage") {
        violations.push(`${relative}:${lineOf(source, node)}: primary slot is missing on DetailPage.`);
      }
    });
    for (const page of detailPages) {
      pages += 1;
      const slots = jsxElements(page, "DetailPage.Primary");
      if (slots.length !== 1) {
        violations.push(
          `${relative}:${lineOf(source, page)}: primary slot accepts exactly one DetailPage.Primary, found ${slots.length}.`,
        );
        continue;
      }
      const slot = slots[0];
      if (!slot) continue;
      const buttons = buttonsIn(slot, source);
      const primaryButtons = buttons.filter((button) => isPrimaryVariant(button.variant));
      if (buttons.length !== 1 || primaryButtons.length !== 1) {
        violations.push(
          `${relative}:${lineOf(source, slot)}: primary slot accepts exactly one primary button, found ${primaryButtons.length} primary and ${buttons.length} ${adapter.action.tag}.`,
        );
      }
    }
  }
}

if (rootArg === -1 && pages < 1) {
  violations.push(`primary slot: ${config.paths.features} does not render a DetailPage.`);
}

if (rootArg !== -1 && pages < 1) {
  violations.push("primary slot: no DetailPage to check.");
}

if (violations.length > 0) {
  for (const violation of violations) console.error(violation);
  process.exit(1);
}

console.log(`primary slot: exactly one primary button on ${pages} detail page(s).`);
