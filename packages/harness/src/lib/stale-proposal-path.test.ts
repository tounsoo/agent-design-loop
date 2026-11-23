import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pastOrSkip, repoRoot } from "./past-revision";
import { staleProposalPathProblems } from "./stale-proposal-path";

function proposalFiles(): string[] {
  return readdirSync(path.join(repoRoot, "proposals"))
    .filter((name) => /^\d{4}-.+\.md$/.test(name))
    .sort()
    .map((name) => `proposals/${name}`);
}

describe("stale-proposal-path", () => {
  it("fails proposal 0001's src paths and proposal 0008's 0009 example, as they were before e8cc09b", (ctx) => {
    const rev = "e8cc09b^";
    const files = new Map([
      ["proposals/0001-approval-note.md", pastOrSkip(ctx, rev, "proposals/0001-approval-note.md")],
      ["proposals/0008-rule-opt-out-and-retirement.md", pastOrSkip(ctx, rev, "proposals/0008-rule-opt-out-and-retirement.md")],
    ]);
    const problems = staleProposalPathProblems(files, proposalFiles()).join("\n");
    expect(problems).toContain("`src/inputs/product.ts`");
    expect(problems).toContain("`src/flows/invoice-approval`");
    expect(problems).toContain("products/meridian/");
    expect(problems).toContain("`proposals/0009-nook-has-no-disclosure.md`");
    expect(problems).toContain("`proposals/0009-design-loop-graph.md`");
  });

  it("passes a later-landing path the repository does not have yet, and still fails a moved root", () => {
    const text = ["## After approval", "", "Add `packages/harness/src/check-new-thing.ts` beside `src/inputs/product.ts`.", ""].join("\n");
    const problems = staleProposalPathProblems(new Map([["proposals/example.md", text]]), []).join("\n");
    expect(problems).toContain("`src/inputs/product.ts`");
    expect(problems).not.toContain("check-new-thing.ts");
  });
});
