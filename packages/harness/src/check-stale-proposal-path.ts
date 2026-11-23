import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { staleProposalPathProblems } from "./lib/stale-proposal-path";

/**
 * Fails a proposal that names another proposal's number with the wrong slug,
 * or that tells a later change to land at a path the move out of src/ left
 * behind. Records of a merged pull request keep the paths they had.
 */

const args = process.argv.slice(2);
if (args.length > 0) {
  console.error("check:stale-proposal-path takes no arguments.");
  process.exit(1);
}

const root = process.cwd();
const dir = path.join(root, "proposals");
const names = readdirSync(dir).filter((name) => name.endsWith(".md")).sort();
const files = new Map(names.map((name) => [`proposals/${name}`, readFileSync(path.join(dir, name), "utf8")]));
const proposalFiles = names.filter((name) => /^\d{4}-/.test(name)).map((name) => `proposals/${name}`);
const problems = staleProposalPathProblems(files, (filePath) => existsSync(path.join(root, filePath)), proposalFiles);
if (problems.length > 0) {
  console.error("stale-proposal-path: a proposal names a path or a proposal file that is not the one the repository has:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log(`stale-proposal-path: ${names.length} proposals name paths and proposal files the repository has.`);
