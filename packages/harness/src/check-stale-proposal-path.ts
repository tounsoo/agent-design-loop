import { staleProposalPathProblems } from "./lib/stale-proposal-path";
import { reportProblems, repoFiles } from "./lib/repo-text";

/**
 * Fails a proposal that names another proposal's number with the wrong slug,
 * or that tells a later change to land under src/, scripts/ or fixtures/.
 */

const args = process.argv.slice(2);
if (args.length > 0) {
  console.error("check:stale-proposal-path takes no arguments.");
  process.exit(1);
}

const root = process.cwd();
const files = repoFiles(root, (rel) => /^proposals\/[^/]+\.md$/.test(rel), "proposals");
const numbered = [...files.keys()].filter((name) => /^proposals\/\d{4}-/.test(name)).sort();
reportProblems(
  staleProposalPathProblems(files, numbered),
  "stale-proposal-path: a proposal names a path or a proposal file that is not the one the repository has:",
  `stale-proposal-path: ${files.size} proposals name paths and proposal files the repository has.`,
);
