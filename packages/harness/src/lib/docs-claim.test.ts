import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { docsClaimProblems } from "./docs-claim";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function show(rev: string, file: string): string {
  return execFileSync("git", ["show", `${rev}:${file}`], { cwd: repoRoot, encoding: "utf8" });
}

function treeDocs(): Map<string, string> {
  const files = new Map<string, string>();
  const skip = new Set(["node_modules", "dist", "coverage", ".cache", ".git", ".vite"]);
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
        continue;
      }
      const rel = path.relative(repoRoot, full).split(path.sep).join("/");
      if (entry.name === "CODEOWNERS" || entry.name === "AGENTS.md" || entry.name.endsWith(".md")) {
        files.set(rel, readFileSync(full, "utf8"));
      }
    }
  };
  visit(repoRoot);
  return files;
}

describe("docs-claim", () => {
  it("fails CODEOWNERS when it says review is required, as it did before ed03947", () => {
    const problems = docsClaimProblems(new Map([["CODEOWNERS", show("ed03947^", "CODEOWNERS")]]));
    expect(problems.join("\n")).toContain("says review is required");
    expect(problems.join("\n")).toContain("blocks a merge only once branch protection requires code owner review");
  });

  it("fails the gallery proposal when a file link is said to open full size, as pull request 40 merged it", () => {
    const problems = docsClaimProblems(
      new Map([["proposals/2026-11-11-screenshot-gallery.md", show("1ea0c7f^", "proposals/2026-11-11-screenshot-gallery.md")]]),
    );
    expect(problems.join("\n")).toContain("says a link to the file opens the image full size");
    expect(problems.join("\n")).toContain("raw.githubusercontent.com");
  });

  it("fails AGENTS.md when it says a cloud agent cannot clone home, as 55f56121 did", () => {
    const problems = docsClaimProblems(
      new Map([["AGENTS.md", show("55f561218bc6e47ee03731292bbda6c66178cb46", "AGENTS.md")]]),
    );
    expect(problems.join("\n")).toContain("cannot clone home");
    expect(problems.join("\n")).toContain("/agent/repos/home");
  });

  it("passes the tree, where each claim is written as it is", () => {
    expect(docsClaimProblems(treeDocs())).toEqual([]);
  });
});
