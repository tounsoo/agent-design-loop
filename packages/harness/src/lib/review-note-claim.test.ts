import { describe, expect, it } from "vitest";
import { pastOrSkip } from "./past-revision";
import { reviewNoteProblems, type Source } from "./review-note-claim";

const TRANSITION = "products/nook/flows/booking/transition.ts";
const STEP = "packages/harness/src/check-step-budget.ts";
const PROPOSALS = "packages/harness/src/lib/proposals.ts";
const INVENTORIES = "packages/harness/src/check-inventories.ts";
const MEMBERSHIP = "packages/harness/src/lib/membership.ts";

function source(file: string, text: string): Source {
  return { file, text };
}

function anchored() {
  return {
    bookingTransition: source(TRANSITION, 'case "set-duration":\nstate.status === "choosing"\ncase "book":\nduration: state.duration\n'),
    stepBudget: source(STEP, "measureRoutes"),
    proposals: source(PROPOSALS, 'export const STATUSES = ["open", "decided", "adopted"] as const\nbefore.status !== "open"\nis new and already adopted\n'),
    inventories: source(INVENTORIES, 'introduced.push("design system adapter")'),
    membership: source(MEMBERSHIP, "before.every((member) => after.includes(member))"),
  };
}

describe("review-note-claim", () => {
  it("fails Nook's note from before 9b00127, which said the booking took the held length and that step-budget measured the new route", (ctx) => {
    const rev = "9b00127^";
    const problems = reviewNoteProblems({
      notes: new Map([["products/nook/review/book-a-held-room.md", pastOrSkip(ctx, rev, "products/nook/review/book-a-held-room.md")]]),
      ...anchored(),
      bookingTransition: source(TRANSITION, pastOrSkip(ctx, rev, TRANSITION)),
      stepBudget: source(STEP, pastOrSkip(ctx, rev, STEP)),
    }).join("\n");
    expect(problems).toContain("length chosen before the hold");
    expect(problems).toContain("every route");
    expect(problems).toContain("measureRoutes");
  });

  it("fails the same note after 9b00127, which said step-budget measures only the shortest path", (ctx) => {
    const rev = "9b00127";
    const problems = reviewNoteProblems({
      notes: new Map([["products/nook/review/book-a-held-room.md", pastOrSkip(ctx, rev, "products/nook/review/book-a-held-room.md")]]),
      ...anchored(),
      bookingTransition: source(TRANSITION, pastOrSkip(ctx, rev, TRANSITION)),
      stepBudget: source(STEP, pastOrSkip(ctx, rev, STEP)),
    }).join("\n");
    expect(problems).toContain("not only the shortest");
    expect(problems).not.toContain("held length");
  });

  it("fails Meridian's notes from before d935b9b, which misstated one-PR additions and proposal pinning", (ctx) => {
    const rev = "d935b9b^";
    const problems = reviewNoteProblems({
      notes: new Map([
        ["products/meridian/review/inventories.md", pastOrSkip(ctx, rev, "products/meridian/review/inventories.md")],
        ["products/meridian/review/content-layouts.md", pastOrSkip(ctx, rev, "products/meridian/review/content-layouts.md")],
      ]),
      ...anchored(),
      proposals: source(PROPOSALS, pastOrSkip(ctx, rev, PROPOSALS)),
      inventories: source(INVENTORIES, pastOrSkip(ctx, rev, INVENTORIES)),
      membership: source(MEMBERSHIP, ""),
    }).join("\n");
    expect(problems).toContain("design system adapter");
    expect(problems).toContain("graduated proposal's lists cannot change");
    expect(problems).toContain("new and already graduated");
    expect(problems).toContain("keeps every member the base had");
    expect(problems).toContain("lists both");
  });

  it("passes an ordinary check:proposals bullet and a step-budget bullet that does not see a change", () => {
    const notes = new Map([
      ["products/meridian/review/note.md", "- `check:proposals` passes on this change.\n- `check:step-budget` does not see a change here, so the budget stays.\n"],
    ]);
    expect(reviewNoteProblems({ notes, ...anchored() })).toEqual([]);
  });

  it("says an adopted proposal, not a adopted one, when a pinning bullet leaves that status out", () => {
    const notes = new Map([["products/meridian/review/note.md", "- `check:proposals` fails a decided proposal whose lists change.\n"]]);
    const problems = reviewNoteProblems({ notes, ...anchored() }).join("\n");
    expect(problems).toContain("an adopted proposal's lists cannot change");
    expect(problems).not.toContain("a adopted");
  });

  it.each([
    ["stepBudget", "measureRoutes", STEP],
    ["inventories", 'introduced.push("design system adapter")', INVENTORIES],
    ["proposals", 'before.status !== "open"', PROPOSALS],
    ["membership", "before.every((member) => after.includes(member))", MEMBERSHIP],
  ] as const)("fails when %s loses %s", (key, needle, file) => {
    const input = anchored();
    const problems = reviewNoteProblems({
      notes: new Map(),
      ...input,
      [key]: source(file, input[key].text.replace(needle, "moved")),
    });
    expect(problems).toContain(`review-note: ${needle} not found in ${file}; update this check`);
  });

  it("fails when the booking transition no longer copies the chosen duration", () => {
    const problems = reviewNoteProblems({
      notes: new Map(),
      ...anchored(),
      bookingTransition: source(TRANSITION, "case \"book\": return state"),
    });
    expect(problems).toContain(`review-note: case "book" duration: state.duration not found in ${TRANSITION}; update this check`);
    expect(problems).toContain(`review-note: case "set-duration" status === "choosing" not found in ${TRANSITION}; update this check`);
  });
});
