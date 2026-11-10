import path from "node:path";
import ts from "typescript";
import { priority } from "../src/inputs/product";
import { attributeValue, elementText, jsxTagName, lineOf, listSourceFiles, parseFile, walk } from "./lib/jsx";

const primaryItem = priority.find((item) => item.rank === 1);
const secondaryItem = priority.find((item) => item.rank === 2);

if (!primaryItem || primaryItem.level !== "primary" || !secondaryItem || secondaryItem.level !== "secondary") {
  console.error("priority: expected rank 1 primary and rank 2 secondary.");
  process.exit(1);
}

type Hit = { file: string; line: number; text: string; inDisclosure: boolean; variant: string | null | "dynamic" };

const buttons: Hit[] = [];
const summaries: Hit[] = [];
const violations: string[] = [];

function insideDisclosure(node: ts.Node): boolean {
  let current = node.parent;
  while (current) {
    if (ts.isJsxElement(current) && jsxTagName(current.openingElement.tagName) === "Disclosure.Root") return true;
    current = current.parent;
  }
  return false;
}

for (const file of listSourceFiles(path.resolve("src/features"))) {
  const source = parseFile(file);
  const relative = path.relative(process.cwd(), file);
  walk(source, (node) => {
    const opening = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
        ? node
        : null;
    if (!opening) return;
    const tag = jsxTagName(opening.tagName);
    if (tag === "Button.Root") {
      buttons.push({
        file: relative,
        line: lineOf(source, opening),
        text: elementText(node).text,
        inDisclosure: insideDisclosure(node),
        variant: attributeValue(opening, "variant"),
      });
    }
    if (tag === "Disclosure.Summary") {
      summaries.push({
        file: relative,
        line: lineOf(source, opening),
        text: elementText(node).text,
        inDisclosure: true,
        variant: null,
      });
    }
  });
}

const primaryButtons = buttons.filter((button) => button.variant === null || button.variant === "primary");
const secondaryButtons = buttons.filter((button) => button.text === secondaryItem.action);

if (primaryButtons.length !== 1 || primaryButtons[0]?.text !== primaryItem.action) {
  violations.push(
    `priority: the only primary button must be "${primaryItem.action}", found ${primaryButtons.map((button) => `"${button.text}"`).join(", ") || "none"}.`,
  );
}

if (primaryButtons.some((button) => button.inDisclosure)) {
  violations.push("priority: a primary button is inside a disclosure.");
}

if (secondaryButtons.length !== 1 || secondaryButtons[0]?.variant !== "secondary") {
  violations.push(
    `priority: rank 2 "${secondaryItem.action}" must be one secondary button, found ${secondaryButtons.map((button) => `${button.variant ?? "primary"}:"${button.text}"`).join(", ") || "none"}.`,
  );
}

if (!summaries.some((summary) => summary.text === "Line items")) {
  violations.push("priority: line items are not behind a disclosure.");
}

if (primaryButtons.some((button) => button.text === secondaryItem.action)) {
  violations.push(`priority: "${secondaryItem.action}" is primary, but its rank is secondary.`);
}

if (violations.length > 0) {
  for (const violation of violations) console.error(violation);
  process.exit(1);
}

console.log(
  `priority: "${primaryItem.action}" is the primary button; "${secondaryItem.action}" is secondary; line items are disclosed.`,
);
