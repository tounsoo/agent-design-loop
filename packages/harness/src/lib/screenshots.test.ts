import { describe, expect, it } from "vitest";
import { galleryMarkdown, pullRequestMarkdown, screenshotName } from "./screenshots";

describe("screenshotName", () => {
  it("names a preview by its state, then each other query pair", () => {
    expect(screenshotName("state=ready")).toBe("ready");
    expect(screenshotName("state=ready&page=detail&branch=request")).toBe("ready--page-detail--branch-request");
  });

  it("keeps a name to letters, digits, dashes and underscores", () => {
    expect(screenshotName("state=ready&route=a%2Fb c")).toBe("ready--route-a-b-c");
  });
});

describe("galleryMarkdown", () => {
  it("wraps every image in a link to its own file, so a click opens it full size", () => {
    const gallery = galleryMarkdown({ product: "products/x/harness.config.ts", base: null, before: [], after: ["ready.png"] });
    expect(gallery).toContain("## ready\n\n[![ready](ready.png)](ready.png)");
  });

  it("puts before and after side by side, and marks a preview one side lacks", () => {
    const gallery = galleryMarkdown({
      product: "products/x/harness.config.ts",
      base: "origin/main (abc1234)",
      before: ["ready.png"],
      after: ["done.png", "ready.png"],
    });
    expect(gallery).toContain("Before is `origin/main (abc1234)`.");
    expect(gallery).toContain("| done | none | [![done, after](after/done.png)](after/done.png) |");
    expect(gallery).toContain("| ready | [![ready, before](before/ready.png)](before/ready.png) | [![ready, after](after/ready.png)](after/ready.png) |");
  });
});

describe("pullRequestMarkdown", () => {
  it("links the gallery pinned to a commit, with no image in the line", () => {
    const line = pullRequestMarkdown({
      repository: "https://github.com/o/r",
      commit: "abc",
      folder: "products/x/review/screenshots/change",
      before: ["ready.png"],
      after: ["ready.png", "done.png"],
    });
    expect(line).toBe("**Screenshots:** [2 previews, before and after](https://github.com/o/r/blob/abc/products/x/review/screenshots/change/README.md)");
    expect(line).not.toContain("![");
  });
});
