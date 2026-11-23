import { docsClaimProblems } from "./lib/docs-claim";
import { reportProblems, repoFiles } from "./lib/repo-text";

/**
 * Fails a doc that claims review is required, that a link to an image's own
 * file opens it full size, or that a cloud agent cannot clone home.
 */

const args = process.argv.slice(2);
if (args.length > 0) {
  console.error("check:docs-claim takes no arguments.");
  process.exit(1);
}

const root = process.cwd();
const files = repoFiles(root, (rel) => rel === "CODEOWNERS" || rel.endsWith("/CODEOWNERS") || rel.endsWith("/AGENTS.md") || rel === "AGENTS.md" || rel.endsWith(".md"));
reportProblems(
  docsClaimProblems(files),
  "docs-claim: a doc states something that is not true:",
  "docs-claim: CODEOWNERS, the gallery wording and AGENTS.md state the three facts as they are.",
);
