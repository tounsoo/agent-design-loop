import path from "node:path";
import ts from "typescript";
import { adapter, isPrimaryVariant } from "./lib/adapter";
import { config } from "./lib/config";
import { attributeValue, elementText, jsxElements, jsxTagName, lineOf, listSourceFiles, parseFile, walk } from "./lib/jsx";
import { discoverShells, primarySlots as primarySlotsOf } from "./lib/page-scope";

/**
 * A page type with a primary slot, named under shells.primarySlots in the
 * harness config, holds its page's one primary action there. Every page of
 * that type fills the slot with exactly one action control, and it is primary.
 * Each page type with a primary slot renders at least one page, so the rule
 * cannot pass over a type nobody renders.
 */

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
const { shells, problems } = discoverShells();
const { slots: primarySlots, problems: ruleProblems } = primarySlotsOf(shells);
for (const problem of [...problems, ...ruleProblems]) violations.push(`primary slot: ${problem}`);

const pagesPerShell = new Map<string, number>();
let pages = 0;

for (const file of listSourceFiles(path.resolve(config.paths.features))) {
  const source = parseFile(file);
  const relative = path.relative(process.cwd(), file);
  for (const { shell, tag } of primarySlots) {
    walk(source, (node) => {
      if (ts.isJsxSelfClosingElement(node) && jsxTagName(node.tagName) === shell.name) {
        violations.push(`${relative}:${lineOf(source, node)}: primary slot is missing on ${shell.name}.`);
      }
    });
    for (const page of jsxElements(source, shell.name)) {
      pages += 1;
      pagesPerShell.set(shell.name, (pagesPerShell.get(shell.name) ?? 0) + 1);
      const slots = jsxElements(page, tag);
      if (slots.length !== 1) {
        violations.push(`${relative}:${lineOf(source, page)}: primary slot accepts exactly one ${tag}, found ${slots.length}.`);
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

for (const { shell } of primarySlots) {
  if (!pagesPerShell.has(shell.name)) violations.push(`primary slot: ${config.paths.features} does not render a ${shell.name}.`);
}

if (violations.length > 0) {
  for (const violation of violations) console.error(violation);
  process.exit(1);
}

const pageTypes = [...new Set(primarySlots.map(({ shell }) => shell.pageType))].join(", ");
console.log(`primary slot: exactly one primary button on ${pages} ${pageTypes} page(s).`);
