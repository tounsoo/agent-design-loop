import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { apply, buildModel, readCases, readMetas, REFERENCE, renderBlocks, renderReference } from "./lib/docs";
import { checkFile, scripts } from "./lib/scripts";

/**
 * Writes the check reference from the code, and fails when a doc holds a
 * stale copy: packages/harness/docs/checks.md whole, and the generated blocks
 * in the harness README, CLAUDE.md and the verify skill. `npm run docs:gen`
 * runs it with --write, which rewrites them. It takes no --config: the
 * reference is the harness's, for every product.
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

const docs: Record<string, string> = { [REFERENCE]: renderReference(built.model) };
for (const [file, blocks] of Object.entries(renderBlocks(built.model))) {
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
if (stale.length > 0 && !write) {
  console.error(`docs: ${stale.map(([file]) => file).join(", ")} ${stale.length === 1 ? "is" : "are"} stale. Run npm run docs:gen.`);
  process.exit(1);
}
for (const [file, text] of stale) {
  writeFileSync(file, text);
  console.log(`docs: wrote ${file}.`);
}

console.log(`docs: ${Object.keys(docs).length} docs describe ${built.model.scripts.length} scripts and ${built.model.cases.length} fixture cases, as the code has them.`);
