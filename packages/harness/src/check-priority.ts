import path from "node:path";
import ts from "typescript";
import { adapter, isPrimaryVariant } from "./lib/adapter";
import { config, loadInputs } from "./lib/config";
import { attributeValue, elementText, jsxTagName, lineOf, listSourceFiles, parseFile, walk } from "./lib/jsx";

const { disclosed_sections, priority } = await loadInputs();

const primaryItem = priority.find((item) => item.rank === 1);
const secondaryItem = priority.find((item) => item.rank === 2);

if (!primaryItem || primaryItem.level !== "primary" || !secondaryItem || secondaryItem.level !== "secondary") {
  console.error("priority: expected rank 1 primary and rank 2 secondary.");
  process.exit(1);
}

const featuresRoot = path.resolve(config.paths.features);

type Hit = { file: string; line: number; text: string; inDisclosure: boolean; variant: string | null | "dynamic" };

const buttons: Hit[] = [];
const summaries: Hit[] = [];
const violations: string[] = [];

function insideDisclosure(node: ts.Node): boolean {
  let current = node.parent;
  while (current) {
    if (ts.isJsxElement(current) && jsxTagName(current.openingElement.tagName) === adapter.disclosure.root) return true;
    current = current.parent;
  }
  return false;
}

for (const file of listSourceFiles(featuresRoot)) {
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
    if (tag === adapter.action.tag) {
      buttons.push({
        file: relative,
        line: lineOf(source, opening),
        text: elementText(node).text,
        inDisclosure: insideDisclosure(node),
        variant: attributeValue(opening, adapter.action.variantProp),
      });
    }
    if (tag === adapter.disclosure.summary) {
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

const primaryButtons = buttons.filter((button) => isPrimaryVariant(button.variant));
const secondaryButtons = buttons.filter((button) => button.text === secondaryItem.action);

if (primaryButtons.length !== 1 || primaryButtons[0]?.text !== primaryItem.action) {
  violations.push(
    `priority: the only primary button must be "${primaryItem.action}", found ${primaryButtons.map((button) => `"${button.text}"`).join(", ") || "none"}.`,
  );
}

if (primaryButtons.some((button) => button.inDisclosure)) {
  violations.push("priority: a primary button is inside a disclosure.");
}

if (secondaryButtons.length !== 1 || secondaryButtons[0]?.variant !== adapter.action.secondary) {
  violations.push(
    `priority: rank 2 "${secondaryItem.action}" must be one secondary button, found ${secondaryButtons.map((button) => `${button.variant ?? "primary"}:"${button.text}"`).join(", ") || "none"}.`,
  );
}

for (const section of disclosed_sections) {
  if (!summaries.some((summary) => summary.text.trim() === section)) {
    violations.push(`priority: "${section}" is not behind a disclosure (disclosed_sections).`);
  }
}

if (primaryButtons.some((button) => button.text === secondaryItem.action)) {
  violations.push(`priority: "${secondaryItem.action}" is primary, but its rank is secondary.`);
}

if (violations.length > 0) {
  for (const violation of violations) console.error(violation);
  process.exit(1);
}

console.log(
  `priority: "${primaryItem.action}" is the primary button; "${secondaryItem.action}" is secondary; disclosed: ${disclosed_sections.map((section) => `"${section}"`).join(", ")}.`,
);
