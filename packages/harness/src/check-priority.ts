import path from "node:path";
import type ts from "typescript";
import { adapter, isPrimaryVariant } from "./lib/adapter";
import { config, loadInputs } from "./lib/config";
import { attributeValue, elementText, lineOf, listSourceFiles, parseFile, walk } from "./lib/jsx";
import { canonicalTag, discoverShells, openingOf, pagesIn, tagsInScope, unreachedElements } from "./lib/page-scope";

/**
 * Priority holds per page, like the other per-page rules (see
 * lib/page-scope.ts): a page holds at most one primary action, and it is the
 * rank-1 action, outside every disclosure; the rank-2 action is secondary.
 * A product may render as many pages as it needs, so two record pages may
 * each hold the rank-1 action. Across the product, the rank-1 action is
 * primary on at least one page and the rank-2 action is shown, so neither can
 * go missing. An action control no page reaches cannot be counted, so one
 * that is primary or carries the rank-2 action fails.
 */

const { disclosed_sections, priority } = await loadInputs();

const primaryItem = priority.find((item) => item.rank === 1);
const secondaryItem = priority.find((item) => item.rank === 2);

if (!primaryItem || primaryItem.level !== "primary" || !secondaryItem || secondaryItem.level !== "secondary") {
  console.error("priority: expected rank 1 primary and rank 2 secondary.");
  process.exit(1);
}

const featuresRoot = path.resolve(config.paths.features);
const ACTION = adapter.action.tag;

type Action = { where: string; text: string; variant: string | null | "dynamic"; disclosures: number };

function actionOf(node: ts.Node, disclosures: number): Action {
  const opening = openingOf(node);
  const source = node.getSourceFile();
  return {
    where: `${path.relative(process.cwd(), source.fileName)}:${lineOf(source, node)}`,
    text: elementText(node).text,
    variant: opening ? attributeValue(opening, adapter.action.variantProp) : null,
    disclosures,
  };
}

const computedVariant = (action: Action) =>
  `priority: "${action.text}" at ${action.where} has a computed ${adapter.action.variantProp}, so the check cannot tell whether it is primary. Write the ${adapter.action.variantProp} as a string.`;

const quoted = (actions: readonly Action[]) => actions.map((action) => `"${action.text}" at ${action.where}`).join(", ");

const violations: string[] = [];
const { shells, problems } = discoverShells();
for (const problem of problems) violations.push(`priority: ${problem}`);
const pages = pagesIn(featuresRoot, shells);
if (pages.length === 0) violations.push(`priority: no page-type shell is rendered in ${path.relative(process.cwd(), featuresRoot)}, so no page was checked.`);

let rankOnePages = 0;
let rankTwoShown = 0;

for (const page of pages) {
  const actions = page.scopes.flatMap((scope) => tagsInScope(scope, ACTION).map((found) => actionOf(found.node, found.disclosures)));
  const primaries = actions.filter((action) => isPrimaryVariant(action.variant));
  for (const action of actions) {
    if (action.variant === "dynamic") violations.push(computedVariant(action));
  }
  const rankTwo = actions.filter((action) => action.text === secondaryItem.action);
  const label = `${page.file}:${page.line} ${page.shell.name} page`;

  if (primaries.length > 1) violations.push(`priority: ${label} has ${primaries.length} primary buttons, ${quoted(primaries)}. A page holds one.`);
  for (const action of primaries) {
    if (action.text === secondaryItem.action) {
      violations.push(`priority: "${secondaryItem.action}" is primary at ${action.where}, but its rank is secondary.`);
    } else if (action.text !== primaryItem.action) {
      violations.push(`priority: ${label} makes "${action.text}" primary at ${action.where}. The only primary action is "${primaryItem.action}".`);
    }
    if (action.disclosures > 0) violations.push(`priority: a primary button is inside a disclosure at ${action.where}.`);
  }
  if (primaries.some((action) => action.text === primaryItem.action)) rankOnePages += 1;

  if (rankTwo.length > 1) violations.push(`priority: ${label} shows rank 2 "${secondaryItem.action}" ${rankTwo.length} times, ${quoted(rankTwo)}.`);
  for (const action of rankTwo) {
    if (action.variant !== adapter.action.secondary && !isPrimaryVariant(action.variant)) {
      violations.push(`priority: rank 2 "${secondaryItem.action}" at ${action.where} must be ${adapter.action.secondary}, found ${action.variant ?? "no variant"}.`);
    }
  }
  rankTwoShown += rankTwo.length;
}

if (pages.length > 0 && rankOnePages === 0) {
  violations.push(`priority: no page holds "${primaryItem.action}" as its primary button.`);
}
if (pages.length > 0 && rankTwoShown === 0) {
  violations.push(`priority: no page shows rank 2 "${secondaryItem.action}" as a ${adapter.action.secondary} button.`);
}

for (const { node } of unreachedElements(featuresRoot, pages, ACTION)) {
  const action = actionOf(node, 0);
  if (action.variant === "dynamic") violations.push(computedVariant(action));
  else if (isPrimaryVariant(action.variant) || action.text === primaryItem.action || action.text === secondaryItem.action) {
    violations.push(`priority: ${action.where}: "${action.text}" is not reached from any page, so its page's priority cannot be checked. Render it in a component or in the shell's JSX.`);
  }
}

const summaries = new Set<string>();
for (const file of listSourceFiles(featuresRoot)) {
  walk(parseFile(file), (node) => {
    const opening = openingOf(node);
    if (opening && canonicalTag(opening) === adapter.disclosure.summary) summaries.add(elementText(node).text.trim());
  });
}
for (const section of disclosed_sections) {
  if (!summaries.has(section)) violations.push(`priority: "${section}" is not behind a disclosure (disclosed_sections).`);
}

if (violations.length > 0) {
  for (const violation of [...new Set(violations)]) console.error(violation);
  process.exit(1);
}

console.log(
  `priority: "${primaryItem.action}" is the primary button on ${rankOnePages} of ${pages.length} pages; "${secondaryItem.action}" is secondary; disclosed: ${disclosed_sections.map((section) => `"${section}"`).join(", ")}.`,
);
