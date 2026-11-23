import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { reviewNoteProblems } from "./lib/review-note-claim";

/**
 * Fails a review note that contradicts the check it restates: a held booking
 * taking a held length, step-budget measuring one route, proposal lists pinned
 * for only one status, an adapter the bootstrap omits, or an addition that
 * drops a member the base had.
 */

const args = process.argv.slice(2);
if (args.length > 0) {
  console.error("check:review-note takes no arguments.");
  process.exit(1);
}

const root = process.cwd();

function read(file: string): string {
  return readFileSync(path.join(root, file), "utf8");
}

function notes(): Map<string, string> {
  const found = new Map<string, string>();
  const products = path.join(root, "products");
  for (const product of readdirSync(products, { withFileTypes: true })) {
    if (!product.isDirectory()) continue;
    const review = path.join(products, product.name, "review");
    if (!existsSync(review)) continue;
    for (const entry of readdirSync(review)) {
      if (!entry.endsWith(".md")) continue;
      const rel = `products/${product.name}/review/${entry}`;
      found.set(rel, read(rel));
    }
  }
  return found;
}

const membership = existsSync(path.join(root, "packages/harness/src/lib/membership.ts")) ? read("packages/harness/src/lib/membership.ts") : "";
const problems = reviewNoteProblems({
  notes: notes(),
  bookingTransition: read("products/nook/flows/booking/transition.ts"),
  stepBudget: read("packages/harness/src/check-step-budget.ts"),
  proposals: read("packages/harness/src/lib/proposals.ts"),
  inventories: `${read("packages/harness/src/check-inventories.ts")}\n${membership}`,
});
if (problems.length > 0) {
  console.error("review-note: a review note claims something the check it restates does not do:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log(`review-note: ${notes().size} review notes match the checks they restate.`);
