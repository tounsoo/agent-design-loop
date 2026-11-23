import { describe, expect, it } from "vitest";
import { docsClaimProblems } from "./docs-claim";
import { pastOrSkip } from "./past-revision";

describe("docs-claim", () => {
  it("fails CODEOWNERS when it says review is required, as it did before ed03947", (ctx) => {
    const problems = docsClaimProblems(new Map([["CODEOWNERS", pastOrSkip(ctx, "ed03947^", "CODEOWNERS")]]));
    expect(problems.join("\n")).toContain("says review is required");
    expect(problems.join("\n")).toContain("blocks a merge only once branch protection requires code owner review");
  });

  it("fails the gallery proposal when a file link is said to open full size, as pull request 40 merged it", (ctx) => {
    const problems = docsClaimProblems(
      new Map([["proposals/2026-11-11-screenshot-gallery.md", pastOrSkip(ctx, "1ea0c7f^", "proposals/2026-11-11-screenshot-gallery.md")]]),
    );
    expect(problems.join("\n")).toContain("says a link to the file opens the image full size");
    expect(problems.join("\n")).toContain("raw.githubusercontent.com");
  });

  it("fails AGENTS.md when it says a cloud agent cannot clone home, as 55f56121 did", (ctx) => {
    const problems = docsClaimProblems(new Map([["AGENTS.md", pastOrSkip(ctx, "55f561218bc6e47ee03731292bbda6c66178cb46", "AGENTS.md")]]));
    expect(problems.join("\n")).toContain("cannot clone home");
    expect(problems.join("\n")).toContain("/agent/repos/home");
  });
});
