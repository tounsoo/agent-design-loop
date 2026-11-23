import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { docsClaimProblems } from "./lib/docs-claim";

/**
 * Fails a doc that claims review is required, that a link to an image's own
 * file opens it full size, or that a cloud agent cannot clone home. Those
 * three claims were false. The check names the sentence to write instead.
 */

const args = process.argv.slice(2);
if (args.length > 0) {
  console.error("check:docs-claim takes no arguments.");
  process.exit(1);
}

const SKIP = new Set(["node_modules", "dist", "coverage", ".cache", ".git", ".vite"]);

function collect(dir: string, root: string, files: Map<string, string>): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collect(full, root, files);
      continue;
    }
    const rel = path.relative(root, full).split(path.sep).join("/");
    if (entry.name === "CODEOWNERS" || entry.name === "AGENTS.md" || entry.name.endsWith(".md")) {
      files.set(rel, readFileSync(full, "utf8"));
    }
  }
}

const root = process.cwd();
const files = new Map<string, string>();
collect(root, root, files);
const problems = docsClaimProblems(files);
if (problems.length > 0) {
  console.error("docs-claim: a doc states something that is not true:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log("docs-claim: CODEOWNERS, the gallery wording and AGENTS.md state the three facts as they are.");
