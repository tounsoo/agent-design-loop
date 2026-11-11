import path from "node:path";
import ts from "typescript";
import { adapter, isDesignSystemImport } from "./lib/adapter";
import { config, uiRoots } from "./lib/config";
import { attributeValue, jsxTagName, lineOf, listSourceFiles, parseFile, walk } from "./lib/jsx";

const rootArg = process.argv.indexOf("--root");
const roots = rootArg === -1 ? uiRoots : [process.argv[rootArg + 1] ?? ""];

const forbiddenTags = new Set(["button", "input", "select", "textarea", "a"]);
/** Other component kits. The adapter's own packages are not foreign, even when they are on this list. */
const foreignPackages = ["@mui/", "antd", "@chakra-ui/", "react-bootstrap", "@radix-ui/"];

type Violation = { file: string; line: number; message: string };
const violations: Violation[] = [];

/** The catalog directory as a path segment, so a --root tree with its own catalog directory keeps its exemption. */
const catalogSegment = `/${path.dirname(config.paths.catalog).split(path.sep).join("/")}/`;

function isCatalogFile(file: string): boolean {
  return file.split(path.sep).join("/").includes(catalogSegment);
}

function scan(file: string): void {
  const source = parseFile(file);
  const catalog = isCatalogFile(file);

  walk(source, (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      const fromDesignSystem = isDesignSystemImport(spec);
      if (fromDesignSystem && !catalog) {
        violations.push({
          file,
          line: lineOf(source, node),
          message: `off-catalog: import "${spec}" directly. Product UI must import from ${path.dirname(config.paths.catalog)}.`,
        });
      }
      if (!fromDesignSystem && foreignPackages.some((name) => spec === name.slice(0, -1) || spec.startsWith(name))) {
        violations.push({
          file,
          line: lineOf(source, node),
          message: `off-catalog: import "${spec}" is not the ${adapter.name} catalog.`,
        });
      }
    }

    const opening = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
        ? node
        : null;
    if (!opening) return;
    const tag = jsxTagName(opening.tagName);
    if (forbiddenTags.has(tag)) {
      violations.push({
        file,
        line: lineOf(source, opening),
        message: `off-catalog: raw <${tag}> is not a catalog control.`,
      });
    }
    if (attributeValue(opening, "style") !== null && !catalog) {
      violations.push({
        file,
        line: lineOf(source, opening),
        message: "off-catalog: a style attribute is a raw escape hatch. Layout comes from catalog primitives.",
      });
    }
  });

}

for (const root of roots) {
  if (!root) {
    console.error("off-catalog: missing --root path");
    process.exit(1);
  }
  const absolute = path.resolve(root);
  const files = absolute.endsWith(".ts") || absolute.endsWith(".tsx") ? [absolute] : listSourceFiles(absolute);
  for (const file of files) scan(file);
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`${path.relative(process.cwd(), violation.file)}:${violation.line}: ${violation.message}`);
  }
  process.exit(1);
}

console.log(`off-catalog: clean (${roots.join(", ")})`);
