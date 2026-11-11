import path from "node:path";
import ts from "typescript";
import { adapter, isDesignSystemImport } from "./lib/adapter";
import { config, configName, uiRoots } from "./lib/config";
import { attributeValue, jsxTagName, lineOf, listSourceFiles, parseFile, walk } from "./lib/jsx";


const forbiddenTags = new Set(["button", "input", "select", "textarea", "a"]);
/** Other component kits. The adapter's own packages are not foreign, even when they are on this list. */
const foreignPackages = ["@mui/", "antd", "@chakra-ui/", "react-bootstrap", "@radix-ui/"];

type Violation = { file: string; line: number; message: string };
const violations: Violation[] = [];

/** The catalog directory as a path segment. Files under it may import the design system directly. */
const catalogSegment = `/${path.dirname(config.paths.catalog).split(path.sep).join("/")}/`;

function isCatalogFile(file: string): boolean {
  return file.split(path.sep).join("/").includes(catalogSegment);
}

/**
 * The directories the config gives this product. A relative import that
 * reaches outside all of them could reach another product's catalog or UI.
 */
const ownDirectories = [
  config.paths.source,
  config.paths.features,
  path.dirname(config.paths.catalog),
  config.paths.pageTypes,
  config.paths.layouts,
  config.paths.contentLayouts,
  ...uiRoots.map((root) => (/\.tsx?$/.test(root) ? path.dirname(root) : root)),
  ...config.flows.flatMap((flow) => [path.dirname(flow.states), path.dirname(flow.views)]),
].map((directory) => path.resolve(directory));

function isInside(directory: string, target: string): boolean {
  const relative = path.relative(directory, target);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function leavesProduct(file: string, spec: string): boolean {
  if (!spec.startsWith(".")) return false;
  const target = path.resolve(path.dirname(file), spec);
  return !ownDirectories.some((directory) => isInside(directory, target));
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
      if (leavesProduct(file, spec)) {
        violations.push({
          file,
          line: lineOf(source, node),
          message: `off-catalog: import "${spec}" reaches outside this product's directories in ${configName}. Product UI imports only from its own product.`,
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

for (const root of uiRoots) {
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

console.log(`off-catalog: clean (${uiRoots.join(", ")})`);
