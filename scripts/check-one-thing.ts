import { existsSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { adapter, isPrimaryVariant } from "./lib/adapter";
import { config, loadRules, memberOf } from "./lib/config";
import { attributeValue, jsxTagName, lineOf, listSourceFiles, parseFile, walk } from "./lib/jsx";
import { canonicalTag, discoverShells, missingCatalogParts, openingOf, collectionShells as collectionShellsOf, pagesIn, tagsInScope, unreachedTags } from "./lib/page-scope";

/**
 * One job per page. Page-type membership lives in allowed_page_types and
 * check:inventories. This check reads that inventory. It does not keep a
 * second list of page type ids.
 *
 * A collection page holds no primary action: it chooses a record, and the
 * record's page acts on it. Which page types are collections is the config's
 * shells.collections.
 *
 * A page is one rendered page-type shell (see scripts/lib/page-scope.ts). The
 * rules hold per page, not per product: a product may render as many pages of
 * a type as it needs, from as many files, but no page renders another page
 * inside it. Each allowed page type renders at least one page, so the rules
 * below cannot pass over a page type nobody renders.
 *
 * A question is a catalog form field: a part the adapter names in questions,
 * which wraps an input, select or textarea. A question inside a disclosure
 * is not visible first.
 * A question on a branch, like the request-changes reason, still counts:
 * the check reads code, not the state at runtime.
 */
const QUESTION_PARTS = adapter.questions;
const { MAX_VISIBLE_QUESTIONS } = await loadRules();

const featuresRoot = path.resolve(config.paths.features);
const catalogFile = path.resolve(config.paths.catalog);

const violations: string[] = [];

for (const part of missingCatalogParts(catalogFile, QUESTION_PARTS)) {
  violations.push(
    `one thing: question part ${part} is not exported by the catalog, so the visible-question cap cannot fire.`,
  );
}

const { shells, problems } = discoverShells();
for (const problem of problems) violations.push(`one thing: ${problem}`);

// Collections are the page types the config names under shells.collections.
const { collections, problems: ruleProblems } = collectionShellsOf(shells);
for (const problem of ruleProblems) violations.push(`one thing: ${problem}`);
const collectionShells = new Set(collections.map(({ shell }) => shell.name));
const scannedLayouts = new Set<string>();

for (const file of listSourceFiles(featuresRoot)) {
  const source = parseFile(file);
  const relative = path.relative(process.cwd(), file);
  for (const shell of shells) {
    if (!collectionShells.has(shell.name)) continue;
    for (const page of shellElements(source, shell.name)) {
      const primary = primaryButtons(page);
      if (primary.length > 0) {
        violations.push(`one thing: ${relative} puts a primary button on the collection page.`);
      }
      for (const layoutId of contentLayoutsIn(page, source)) {
        const dir = path.resolve(config.paths.contentLayouts, layoutId);
        if (scannedLayouts.has(dir) || !existsSync(dir)) continue;
        scannedLayouts.add(dir);
        for (const layoutFile of listSourceFiles(dir)) {
          const layoutSource = parseFile(layoutFile);
          if (primaryButtons(layoutSource).length === 0) continue;
          violations.push(
            `one thing: ${path.relative(process.cwd(), layoutFile)} puts a primary button on the collection page.`,
          );
        }
      }
    }
  }
}

const pages = pagesIn(featuresRoot, shells);
const shellNames = new Set(shells.map((shell) => shell.name));

for (const page of pages) {
  for (const scope of page.scopes) {
    walk(scope.node, (node) => {
      const opening = openingOf(node);
      if (!opening || node === page.node) return;
      const tag = canonicalTag(opening);
      if (!shellNames.has(tag)) return;
      const where = `${path.relative(process.cwd(), scope.source.fileName)}:${lineOf(scope.source, opening)}`;
      violations.push(`one thing: ${page.file}:${page.line} ${page.shell.name} page renders a ${tag} page inside it, at ${where}. One page does one job.`);
    });
  }
}

for (const pageType of new Set(shells.map((shell) => shell.pageType))) {
  if (!pages.some((page) => page.shell.pageType === pageType)) {
    violations.push(
      `one thing: page type "${pageType}" renders no page in ${path.relative(process.cwd(), featuresRoot)}, so its per-page rules cannot run.`,
    );
  }
}
for (const part of QUESTION_PARTS) {
  for (const where of unreachedTags(featuresRoot, pages, part)) {
    violations.push(
      `one thing: ${where}: ${part} is not reached from any page, so the visible-question cap cannot count it. Render it in a component or in the shell's JSX.`,
    );
  }
}

for (const page of pages) {
  let visibleQuestions = 0;
  for (const scope of page.scopes) {
    for (const part of QUESTION_PARTS) {
      visibleQuestions += tagsInScope(scope, part).filter((found) => found.disclosures === 0).length;
    }
  }
  if (visibleQuestions > MAX_VISIBLE_QUESTIONS) {
    violations.push(
      `one thing: ${page.file}:${page.line} ${page.shell.name} page shows ${visibleQuestions} questions outside a disclosure (max ${MAX_VISIBLE_QUESTIONS}).`,
    );
  }
}

function shellElements(source: ts.SourceFile, tag: string): ts.Node[] {
  const found: ts.Node[] = [];
  walk(source, (node) => {
    const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
    if (opening && jsxTagName(opening.tagName) === tag) found.push(node);
  });
  return found;
}

function primaryButtons(root: ts.Node): ts.Node[] {
  const found: ts.Node[] = [];
  walk(root, (node) => {
    const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
    if (!opening || jsxTagName(opening.tagName) !== adapter.action.tag) return;
    if (isPrimaryVariant(attributeValue(opening, adapter.action.variantProp))) found.push(node);
  });
  return found;
}

function contentLayoutsIn(root: ts.Node, source: ts.SourceFile): string[] {
  const imports = new Map<string, string>();
  walk(source, (node) => {
    if (!ts.isImportDeclaration(node) || !node.importClause || !ts.isStringLiteral(node.moduleSpecifier)) return;
    const specifier = node.moduleSpecifier.text;
    const named = node.importClause.namedBindings;
    if (!named || !ts.isNamedImports(named)) return;
    for (const element of named.elements) {
      if (!element.isTypeOnly) imports.set(element.name.text, specifier);
    }
  });
  const ids: string[] = [];
  walk(root, (node) => {
    const opening = ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
    if (!opening) return;
    const rootName = jsxTagName(opening.tagName).split(".")[0] ?? "";
    const specifier = imports.get(rootName);
    const id = specifier ? memberOf(specifier, config.paths.contentLayouts) : null;
    if (id) ids.push(id);
  });
  return [...new Set(ids)];
}

if (violations.length > 0) {
  for (const violation of violations) console.error(violation);
  process.exit(1);
}

console.log(
  `one thing: one job per page on ${pages.length} pages: no page inside another, no primary on a collection page, at most ${MAX_VISIBLE_QUESTIONS} question outside a disclosure per page.`,
);
