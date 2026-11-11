import { existsSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { MAX_VISIBLE_QUESTIONS } from "../src/rules/ux-rules";
import { attributeValue, jsxTagName, listSourceFiles, parseFile, walk } from "./lib/jsx";
import { discoverShells, missingCatalogParts, pagesIn, tagsInScope, unreachedTags } from "./lib/page-scope";

/**
 * One job per page. Page-type membership lives in allowed_page_types and
 * check:inventories. This check reads that inventory. It does not keep a
 * second list of page type ids.
 *
 * A question is a catalog form field. Todae's Field.Root wraps every input,
 * select and textarea. A question inside a disclosure is not visible first.
 * A question on a branch, like the request-changes reason, still counts:
 * the check reads code, not the state at runtime.
 */
const QUESTION_PARTS = ["Field.Root"] as const;

function flag(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    console.error(`one thing: missing ${name} path`);
    process.exit(1);
  }
  return value;
}

const featuresRoot = path.resolve(flag("--features", "src/features"));
const catalogFile = path.resolve(flag("--catalog", "src/catalog/index.ts"));

const violations: string[] = [];

for (const part of missingCatalogParts(catalogFile, QUESTION_PARTS)) {
  violations.push(
    `one thing: question part ${part} is not exported by the catalog, so the visible-question cap cannot fire.`,
  );
}

const { shells, problems } = discoverShells();
for (const problem of problems) violations.push(`one thing: ${problem}`);

const shellCounts = new Map<string, number>(shells.map((shell) => [shell.name, 0]));
const collectionShells = new Set(shells.filter((shell) => shell.pageType === "collection").map((shell) => shell.name));
const scannedLayouts = new Set<string>();

for (const file of listSourceFiles(featuresRoot)) {
  const source = parseFile(file);
  const relative = path.relative(process.cwd(), file);
  for (const shell of shells) {
    const pages = shellElements(source, shell.name);
    shellCounts.set(shell.name, (shellCounts.get(shell.name) ?? 0) + pages.length);
    if (pages.length > 1) {
      violations.push(`one thing: ${relative} renders ${pages.length} ${shell.name} shells.`);
    }
    if (!collectionShells.has(shell.name)) continue;
    for (const page of pages) {
      const primary = primaryButtons(page);
      if (primary.length > 0) {
        violations.push(`one thing: ${relative} puts a primary button on the collection page.`);
      }
      for (const layoutId of contentLayoutsIn(page, source)) {
        const dir = path.resolve("src/content-layouts", layoutId);
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

for (const [tag, count] of shellCounts) {
  if (count !== 1) {
    violations.push(`one thing: expected exactly one ${tag} in ${path.relative(process.cwd(), featuresRoot)}, found ${count}.`);
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
    if (!opening || jsxTagName(opening.tagName) !== "Button.Root") return;
    const variant = attributeValue(opening, "variant");
    if (variant === null || variant === "primary") found.push(node);
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
    const match = specifier ? /(?:^|\/)content-layouts\/([^/"']+)/.exec(specifier) : null;
    if (match?.[1]) ids.push(match[1]);
  });
  return [...new Set(ids)];
}


if (violations.length > 0) {
  for (const violation of violations) console.error(violation);
  process.exit(1);
}

console.log(
  `one thing: one shell per page type, no primary on the collection page, at most ${MAX_VISIBLE_QUESTIONS} question outside a disclosure per page.`,
);
