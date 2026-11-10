import path from "node:path";
import ts from "typescript";
import { MAX_DISCLOSURE_DEPTH, MAX_DISCLOSURES_PER_PAGE } from "../src/rules/ux-rules";
import { jsxElements, jsxTagName, lineOf, listSourceFiles, parseFile } from "./lib/jsx";

function ancestorTags(node: ts.Node, tag: string): number {
  let count = 0;
  let current = node.parent;
  while (current) {
    if (ts.isJsxElement(current) && jsxTagName(current.openingElement.tagName) === tag) count += 1;
    current = current.parent;
  }
  return count;
}

const violations: string[] = [];

for (const file of listSourceFiles(path.resolve("src/features"))) {
  const source = parseFile(file);
  const relative = path.relative(process.cwd(), file);
  const disclosures = jsxElements(source, "Disclosure.Root");
  if (disclosures.length > MAX_DISCLOSURES_PER_PAGE) {
    violations.push(
      `${relative}: disclosure count ${disclosures.length} exceeds ${MAX_DISCLOSURES_PER_PAGE} per page.`,
    );
  }
  for (const disclosure of disclosures) {
    const depth = ancestorTags(disclosure, "Disclosure.Root") + 1;
    if (depth > MAX_DISCLOSURE_DEPTH) {
      violations.push(
        `${relative}:${lineOf(source, disclosure)}: disclosure depth ${depth} exceeds ${MAX_DISCLOSURE_DEPTH}.`,
      );
    }
  }
}

if (violations.length > 0) {
  for (const violation of violations) console.error(`disclosure: ${violation}`);
  process.exit(1);
}

console.log(
  `disclosure: depth ≤ ${MAX_DISCLOSURE_DEPTH} and at most ${MAX_DISCLOSURES_PER_PAGE} per feature file.`,
);
