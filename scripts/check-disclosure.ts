import path from "node:path";
import { MAX_DISCLOSURE_DEPTH, MAX_DISCLOSURES_PER_PAGE } from "../src/rules/ux-rules";
import { lineOf } from "./lib/jsx";
import { discoverShells, missingCatalogParts, pagesIn, tagsInScope } from "./lib/page-scope";

/**
 * Disclosures are counted per page: one rendered page-type shell in
 * src/features, the components it renders, its content layouts, the shell
 * module, and the chrome layouts around it. See scripts/lib/page-scope.ts.
 */
const DISCLOSURE = "Disclosure.Root";

function flag(name: string, fallback: string): string {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    console.error(`disclosure: missing ${name} path`);
    process.exit(1);
  }
  return value;
}

const featuresRoot = path.resolve(flag("--features", "src/features"));
const catalogFile = path.resolve(flag("--catalog", "src/catalog/index.ts"));

const violations: string[] = [];

for (const part of missingCatalogParts(catalogFile, [DISCLOSURE])) {
  violations.push(`${part} is not exported by the catalog, so the disclosure caps cannot fire.`);
}

const { shells } = discoverShells();
const pages = pagesIn(featuresRoot, shells);

for (const page of pages) {
  let count = 0;
  for (const scope of page.scopes) {
    for (const found of tagsInScope(scope, DISCLOSURE)) {
      count += 1;
      const depth = found.disclosures + 1;
      if (depth > MAX_DISCLOSURE_DEPTH) {
        const where = `${path.relative(process.cwd(), scope.source.fileName)}:${lineOf(scope.source, found.node)}`;
        violations.push(`${where}: disclosure depth ${depth} exceeds ${MAX_DISCLOSURE_DEPTH}.`);
      }
    }
  }
  if (count > MAX_DISCLOSURES_PER_PAGE) {
    violations.push(
      `${page.file}:${page.line}: ${page.shell.name} page has ${count} disclosures, more than ${MAX_DISCLOSURES_PER_PAGE} per page.`,
    );
  }
}

if (violations.length > 0) {
  for (const violation of [...new Set(violations)]) console.error(`disclosure: ${violation}`);
  process.exit(1);
}

console.log(
  `disclosure: depth ≤ ${MAX_DISCLOSURE_DEPTH} and at most ${MAX_DISCLOSURES_PER_PAGE} per page, across ${pages.length} pages.`,
);
