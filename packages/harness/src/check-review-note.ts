import { reviewNoteProblems } from "./lib/review-note-claim";
import { readText, reportProblems, repoFiles } from "./lib/repo-text";

/**
 * Fails a review note that contradicts the check it restates, and fails closed
 * when a string that rule reads is no longer in the file.
 */

const args = process.argv.slice(2);
if (args.length > 0) {
  console.error("check:review-note takes no arguments.");
  process.exit(1);
}

const root = process.cwd();
const notes = repoFiles(root, (rel) => /^products\/[^/]+\/review\/[^/]+\.md$/.test(rel), "products");
const source = (file: string) => ({ file, text: readText(root, file) });
reportProblems(
  reviewNoteProblems({
    notes,
    bookingTransition: source("products/nook/flows/booking/transition.ts"),
    stepBudget: source("packages/harness/src/check-step-budget.ts"),
    proposals: source("packages/harness/src/lib/proposals.ts"),
    inventories: source("packages/harness/src/check-inventories.ts"),
    membership: source("packages/harness/src/lib/membership.ts"),
  }),
  "review-note: a review note claims something the check it restates does not do:",
  `review-note: ${notes.size} review notes match the checks they restate.`,
);
