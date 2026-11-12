import { describe, expect, it } from "vitest";
import { galleryMarkdown, pinGallery, pullRequestMarkdown, rawFolderUrl, screenshotName } from "./screenshots";

describe("screenshotName", () => {
  it("names a screenshot by its scenario, then its view", () => {
    expect(screenshotName("booking-lantern", "phone-dark")).toBe("booking-lantern--phone-dark");
  });
});

describe("galleryMarkdown", () => {
  it("wraps every image in a link to its own file, for --pin to point at the raw file", () => {
    const gallery = galleryMarkdown({ product: "products/x/harness.config.ts", base: null, before: [], after: ["ready.png"] });
    expect(gallery).toContain("## ready\n\n[![ready](ready.png)](ready.png)");
    expect(gallery).toContain("`phone-dark` (390 by 844, dark)");
  });

  it("puts before and after side by side, and marks a screenshot one side lacks", () => {
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

describe("pinGallery", () => {
  const raw = rawFolderUrl({ owner: "o", repo: "r", commit: "abc123", folder: "products/x/review/screenshots/change" });

  it("addresses the folder's raw files at the commit", () => {
    expect(raw).toBe("https://raw.githubusercontent.com/o/r/abc123/products/x/review/screenshots/change");
    expect(rawFolderUrl({ owner: "o", repo: "r", commit: "abc", folder: "a b/c" })).toBe("https://raw.githubusercontent.com/o/r/abc/a%20b/c");
  });

  it("points each image's link at its raw file, so a click opens the PNG itself", () => {
    const gallery = galleryMarkdown({ product: "products/x/harness.config.ts", base: "origin/main (abc1234)", before: ["ready.png"], after: ["done.png", "ready.png"] });
    const { markdown, files } = pinGallery(gallery, raw);
    expect(files).toEqual(["after/done.png", "before/ready.png", "after/ready.png"]);
    expect(markdown).toContain(`| ready | [![ready, before](before/ready.png)](${raw}/before/ready.png) | [![ready, after](after/ready.png)](${raw}/after/ready.png) |`);
    expect(markdown).toContain("| done | none |");
    expect(gallery).toContain("Click an image to open its file.");
    expect(markdown).toContain("Click an image to open it full size.");
  });

  it("moves links pinned before to the new commit", () => {
    const gallery = galleryMarkdown({ product: "products/x/harness.config.ts", base: null, before: [], after: ["ready.png"] });
    const first = pinGallery(gallery, raw).markdown;
    const later = rawFolderUrl({ owner: "o", repo: "r", commit: "def456", folder: "products/x/review/screenshots/change" });
    expect(pinGallery(first, later).markdown).toContain(`[![ready](ready.png)](${later}/ready.png)`);
    expect(pinGallery(first, later).markdown).not.toContain("abc123");
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
    expect(line).toBe("**Screenshots:** [2 screenshots, before and after](https://github.com/o/r/blob/abc/products/x/review/screenshots/change/README.md)");
    expect(line).not.toContain("![");
  });
});
