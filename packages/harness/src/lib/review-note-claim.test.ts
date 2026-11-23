import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { reviewNoteProblems } from "./review-note-claim";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function show(rev: string, file: string): string {
  return execFileSync("git", ["show", `${rev}:${file}`], { cwd: repoRoot, encoding: "utf8" });
}

function read(file: string): string {
  return readFileSync(path.join(repoRoot, file), "utf8");
}

function currentNotes(): Map<string, string> {
  const notes = new Map<string, string>();
  for (const product of readdirSync(path.join(repoRoot, "products"))) {
    const review = path.join(repoRoot, "products", product, "review");
    if (!existsSync(review)) continue;
    for (const name of readdirSync(review)) {
      if (!name.endsWith(".md")) continue;
      const rel = `products/${product}/review/${name}`;
      notes.set(rel, read(rel));
    }
  }
  return notes;
}

describe("review-note-claim", () => {
  it("fails Nook's note from before 9b00127, which said the booking took the held length and that step-budget measured the new route", () => {
    const problems = reviewNoteProblems({
      notes: new Map([["products/nook/review/book-a-held-room.md", show("9b00127^", "products/nook/review/book-a-held-room.md")]]),
      bookingTransition: show("9b00127^", "products/nook/flows/booking/transition.ts"),
      stepBudget: show("9b00127^", "packages/harness/src/check-step-budget.ts"),
      proposals: "",
      inventories: "",
    }).join("\n");
    expect(problems).toContain("length chosen before the hold");
    expect(problems).toContain("every route");
    expect(problems).toContain("measureRoutes");
  });

  it("fails the same note after 9b00127, which said step-budget measures only the shortest path", () => {
    const problems = reviewNoteProblems({
      notes: new Map([["products/nook/review/book-a-held-room.md", show("9b00127", "products/nook/review/book-a-held-room.md")]]),
      bookingTransition: show("9b00127", "products/nook/flows/booking/transition.ts"),
      stepBudget: show("9b00127", "packages/harness/src/check-step-budget.ts"),
      proposals: "",
      inventories: "",
    }).join("\n");
    expect(problems).toContain("not only the shortest");
    expect(problems).not.toContain("held length");
  });

  it("fails Meridian's notes from before d935b9b, which misstated one-PR additions and proposal pinning", () => {
    const problems = reviewNoteProblems({
      notes: new Map([
        ["products/meridian/review/inventories.md", show("d935b9b^", "products/meridian/review/inventories.md")],
        ["products/meridian/review/content-layouts.md", show("d935b9b^", "products/meridian/review/content-layouts.md")],
      ]),
      bookingTransition: "",
      stepBudget: "",
      proposals: show("d935b9b^", "packages/harness/src/lib/proposals.ts"),
      inventories: show("d935b9b^", "packages/harness/src/check-inventories.ts"),
    }).join("\n");
    expect(problems).toContain("design system adapter");
    expect(problems).toContain("graduated proposal's lists cannot change");
    expect(problems).toContain("new and already graduated");
    expect(problems).toContain("keeps every member the base had");
    expect(problems).toContain("lists both");
  });

  it("passes the review notes against the checks as they are", () => {
    const membership = read("packages/harness/src/lib/membership.ts");
    expect(
      reviewNoteProblems({
        notes: currentNotes(),
        bookingTransition: read("products/nook/flows/booking/transition.ts"),
        stepBudget: read("packages/harness/src/check-step-budget.ts"),
        proposals: read("packages/harness/src/lib/proposals.ts"),
        inventories: `${read("packages/harness/src/check-inventories.ts")}\n${membership}`,
      }),
    ).toEqual([]);
  });
});
