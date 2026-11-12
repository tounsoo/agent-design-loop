import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { resolveBaseRev } from "./lib/base";
import { DEFAULT_PROPOSALS, parseConfig } from "./lib/parse-config";
import { harnessDir, productConfigs } from "./lib/products";
import { nameProblems, parseAll, sharedNameProblems, proposalsAtRev, proposalsInDir, transitionProblems } from "./lib/proposals";

/**
 * Every proposal parses: front matter with a status and the changes it
 * covers, and a Reason, a Preview and an Adoption with text under each. A
 * proposal the change adds or approves that changes or adds members lists
 * its States, the edge cases included. And
 * against the pull request base, read as check:inventories reads it, every
 * status moved only open → decided → adopted, one step per change, with
 * nothing an approved proposal covers widened. A new proposal cannot adopt
 * what it names in the change that adds it, and is named for the UTC day it
 * was written and a slug, so parallel changes cannot pick the same name.
 *
 * The folders read are `proposals/` and every product config's
 * `paths.proposals`. It takes no arguments.
 */

if (process.argv.length > 2) {
  console.error("check:proposals takes no arguments. It reads proposals/ and every product's paths.proposals.");
  process.exit(1);
}

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" }).split("\n");
// A folder named proposals is read before any config names it, so a proposal seeded there for a later paths.proposals move is checked when it lands.
const seeded = files
  .filter((file) => file.endsWith(".md") && path.posix.basename(path.posix.dirname(file)) === "proposals" && !file.startsWith(`${harnessDir}/`))
  .map((file) => path.posix.dirname(file));
const configs = productConfigs();
const dirs = [
  ...new Set([DEFAULT_PROPOSALS, ...seeded, ...configs.map((file) => parseConfig(readFileSync(file, "utf8"), file).paths.proposals)].map((dir) => path.posix.normalize(dir).replace(/\/+$/, ""))),
].sort();

const resolved = resolveBaseRev("proposals");
if ("problem" in resolved) {
  console.error(resolved.problem);
  process.exit(1);
}
const rev = resolved.rev;

const problems: string[] = [];
let count = 0;
const allHead: string[] = [];
const allBase: string[] = [];
for (const dir of dirs) {
  const headFiles = proposalsInDir(dir);
  const baseFiles = proposalsAtRev(rev, dir);
  allHead.push(...headFiles.keys());
  allBase.push(...baseFiles.keys());
  const head = parseAll(headFiles);
  const base = parseAll(baseFiles, { base: true });
  count += head.proposals.size;
  problems.push(
    ...nameProblems(baseFiles.keys(), headFiles.keys()),
    ...head.problems,
    ...transitionProblems(base.proposals, head.proposals, base.legacy, head.unparsed),
  );
}

problems.push(...sharedNameProblems(allBase, allHead));

if (problems.length > 0) {
  console.error(`proposals: compared with ${rev.slice(0, 7)}:`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log(`proposals: ${count} proposals in ${dirs.join(", ")} have their fields and sections, each new one has a dated name, new and approved ones list their states, and each status moved one step at most from ${rev.slice(0, 7)}.`);
