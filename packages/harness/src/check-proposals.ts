import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveBaseRev } from "./lib/base";
import { DEFAULT_PROPOSALS, parseConfig } from "./lib/parse-config";
import { parseAll, proposalsAtRev, proposalsInDir, transitionProblems } from "./lib/proposals";

/**
 * Every proposal parses: front matter with a status and the changes it
 * covers, and a Reason, a Preview and a Graduation with text under each. And
 * against the pull request base, read as check:inventories reads it, every
 * status moved only open → decided → graduated, one step per change, with
 * nothing an approved proposal covers widened. A new proposal cannot graduate
 * what it names in the change that adds it.
 *
 * The folders read are `proposals/` and every product config's
 * `paths.proposals`. It takes no arguments.
 */

if (process.argv.length > 2) {
  console.error("check:proposals takes no arguments. It reads proposals/ and every product's paths.proposals.");
  process.exit(1);
}

const harnessDir = path.relative(process.cwd(), path.dirname(path.dirname(fileURLToPath(import.meta.url)))).split(path.sep).join("/");
const configs = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .split("\n")
  // A config deleted from the working tree but still in the index is no longer a product, as check:retirement reads it.
  .filter((file) => path.posix.basename(file) === "harness.config.ts" && !file.startsWith(`${harnessDir}/`) && existsSync(file));
const dirs = [
  ...new Set([DEFAULT_PROPOSALS, ...configs.map((file) => parseConfig(readFileSync(file, "utf8"), file).paths.proposals)].map((dir) => path.posix.normalize(dir).replace(/\/+$/, ""))),
].sort();

let rev: string;
try {
  rev = resolveBaseRev();
} catch (error) {
  console.error(`proposals: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const problems: string[] = [];
let count = 0;
for (const dir of dirs) {
  const head = parseAll(proposalsInDir(dir));
  const base = parseAll(proposalsAtRev(rev, dir));
  count += head.proposals.size;
  problems.push(...head.problems, ...transitionProblems(base.proposals, head.proposals, base.legacy, head.unparsed));
}

if (problems.length > 0) {
  console.error(`proposals: compared with ${rev.slice(0, 7)}:`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log(`proposals: ${count} proposals in ${dirs.join(", ")} have their fields and sections, and each status moved one step at most from ${rev.slice(0, 7)}.`);
