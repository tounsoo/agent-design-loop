import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { apply, buildModel, readCases, readMetas, REFERENCE, renderBlocks, renderReference } from "./lib/docs";
import { productConfigs } from "./lib/products";
import { checkFile, scripts } from "./lib/scripts";
import { readMapFiles, readProductRegistry, verifyMapProblems, VERIFY_MAP, type ProductRegistry } from "./lib/verify-map";

/**
 * Writes the check reference from the code, and fails when a doc holds a
 * stale copy: packages/harness/docs/checks.md whole, and the generated blocks
 * in the harness README, CLAUDE.md, the verify skill and its map. `npm run
 * docs:gen` runs it with --write, which rewrites them. It also holds the
 * verify map to the product registry: every page type, layout, content
 * layout, task and scenario of every product is covered by a feature file,
 * and nothing a feature file covers is gone. That part is hand-written, so
 * --write never fixes it. It takes no --config: it reads every product.
 */

const args = process.argv.slice(2);
const write = args.length === 1 && args[0] === "--write";
if (args.length > 0 && !write) {
  console.error("check:docs takes no arguments but --write, which npm run docs:gen passes to rewrite the docs.");
  process.exit(1);
}

const src = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(path.dirname(src), "fixtures");
const relative = (file: string): string => path.relative(process.cwd(), file).split(path.sep).join("/");

const files = new Map<string, string>();
for (const [name, command] of Object.entries(scripts)) {
  const file = checkFile(command);
  if (file) files.set(name, path.posix.relative(relative(src), file));
}

const built = buildModel({
  scripts,
  files,
  metas: await readMetas(src),
  read: (file) => readFileSync(path.join(src, file), "utf8"),
  cases: readCases(fixtures),
});
if ("problems" in built) {
  console.error("docs: the check reference cannot be written:");
  for (const problem of built.problems) console.error(`- ${problem}`);
  process.exit(1);
}

const products: ProductRegistry[] = [];
const registryProblems: string[] = [];
for (const config of productConfigs()) {
  const read = await readProductRegistry(config);
  registryProblems.push(...read.problems);
  if (read.registry) products.push(read.registry);
}
if (registryProblems.length > 0) {
  console.error("docs: the product registry cannot be read:");
  for (const problem of registryProblems) console.error(`- ${problem}`);
  process.exit(1);
}

const docs: Record<string, string> = { [REFERENCE]: renderReference(built.model) };
for (const [file, blocks] of Object.entries(renderBlocks(built.model, products))) {
  const applied = apply(readFileSync(file, "utf8").replace(/\r\n/g, "\n"), blocks);
  if ("problem" in applied) {
    console.error(`docs: ${file} ${applied.problem}`);
    process.exit(1);
  }
  docs[file] = applied.text;
}

const stale = Object.entries(docs).filter(([file, text]) => {
  try {
    return readFileSync(file, "utf8").replace(/\r\n/g, "\n") !== text;
  } catch {
    return true;
  }
});
// The map is read before anything exits, so a pull request that adds a page type with no recipe sees both what docs:gen
// would rewrite and the recipe it still needs in one run; docs:gen never writes a feature file.
const mapProblems = verifyMapProblems(products, readMapFiles());
const reportMap = (): void => {
  console.error(`docs: the verify map in ${VERIFY_MAP}/ misses what the products have:`);
  for (const problem of mapProblems) console.error(`- ${problem}`);
};
if (stale.length > 0 && !write) {
  console.error(`docs: ${stale.map(([file]) => file).join(", ")} ${stale.length === 1 ? "is" : "are"} stale. Run npm run docs:gen.`);
  if (mapProblems.length > 0) reportMap();
  process.exit(1);
}
for (const [file, text] of stale) {
  writeFileSync(file, text);
  console.log(`docs: wrote ${file}.`);
}

console.log(`docs: ${Object.keys(docs).length} docs describe ${built.model.scripts.length} scripts, ${built.model.cases.length} fixture cases and ${products.length} ${products.length === 1 ? "product" : "products"}, as the code has them.`);

if (mapProblems.length > 0) {
  reportMap();
  process.exit(1);
}
const count = (kind: (product: ProductRegistry) => readonly unknown[]): number => products.reduce((sum, product) => sum + kind(product).length, 0);
console.log(
  `docs: the verify map covers ${count((product) => product.pageTypes)} page types, ${count((product) => product.layouts)} layouts, ${count((product) => product.contentLayouts)} content layouts, ${count((product) => product.tasks)} tasks and ${count((product) => product.scenarios)} scenarios of ${products.length} ${products.length === 1 ? "product" : "products"}, and nothing they lack.`,
);
