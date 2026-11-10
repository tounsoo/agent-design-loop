import path from "node:path";
import ts from "typescript";
import { attributeValue, elementText, jsxElements, jsxTagName, lineOf, listSourceFiles, parseFile, walk } from "./lib/jsx";

const rootArg = process.argv.indexOf("--root");
const roots = rootArg === -1 ? ["src/features"] : [process.argv[rootArg + 1] ?? ""];

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
    if (!opening || jsxTagName(opening.tagName) !== "Button.Root") return;
    hits.push({
      line: lineOf(source, opening),
      variant: attributeValue(opening, "variant"),
      text: elementText(current).text,
    });
  });
  return hits;
}

function isPrimaryVariant(variant: ButtonHit["variant"]): boolean {
  return variant === null || variant === "primary";
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
    const settingsPages = jsxElements(source, "SettingsPage");
    walk(source, (node) => {
      if (ts.isJsxSelfClosingElement(node) && jsxTagName(node.tagName) === "SettingsPage") {
        violations.push(`${relative}:${lineOf(source, node)}: primary slot is missing on SettingsPage.`);
      }
    });
    for (const page of settingsPages) {
      pages += 1;
      const slots = jsxElements(page, "SettingsPage.Primary");
      if (slots.length !== 1) {
        violations.push(
          `${relative}:${lineOf(source, page)}: primary slot accepts exactly one SettingsPage.Primary, found ${slots.length}.`,
        );
        continue;
      }
      const slot = slots[0];
      if (!slot) continue;
      const buttons = buttonsIn(slot, source);
      const primaryButtons = buttons.filter((button) => isPrimaryVariant(button.variant));
      if (buttons.length !== 1 || primaryButtons.length !== 1) {
        violations.push(
          `${relative}:${lineOf(source, slot)}: primary slot accepts exactly one primary button, found ${primaryButtons.length} primary and ${buttons.length} Button.Root.`,
        );
      }
    }
  }
}

if (rootArg === -1 && pages < 1) {
  violations.push("primary slot: src/features does not render a SettingsPage.");
}

if (rootArg !== -1 && pages < 1) {
  violations.push("primary slot: no SettingsPage to check.");
}

if (violations.length > 0) {
  for (const violation of violations) console.error(violation);
  process.exit(1);
}

console.log(`primary slot: exactly one primary button on ${pages} settings page(s).`);
