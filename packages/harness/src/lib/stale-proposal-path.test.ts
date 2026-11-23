import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { staleProposalPathProblems } from "./stale-proposal-path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const exists = (filePath: string) => existsSync(path.join(repoRoot, filePath));

function show(rev: string, file: string): string {
  return execFileSync("git", ["show", `${rev}:${file}`], { cwd: repoRoot, encoding: "utf8" });
}

function proposalFiles(): string[] {
  return readdirSync(path.join(repoRoot, "proposals"))
    .filter((name) => /^\d{4}-.+\.md$/.test(name))
    .sort()
    .map((name) => `proposals/${name}`);
}

function currentProposals(): Map<string, string> {
  const dir = path.join(repoRoot, "proposals");
  return new Map(
    readdirSync(dir)
      .filter((name) => name.endsWith(".md"))
      .sort()
      .map((name) => [`proposals/${name}`, readFileSync(path.join(dir, name), "utf8")]),
  );
}

describe("stale-proposal-path", () => {
  it("fails proposal 0001's src paths and proposal 0008's 0009 example, as they were before e8cc09b", () => {
    const files = new Map([
      ["proposals/0001-approval-note.md", show("e8cc09b^", "proposals/0001-approval-note.md")],
      ["proposals/0008-rule-opt-out-and-retirement.md", show("e8cc09b^", "proposals/0008-rule-opt-out-and-retirement.md")],
    ]);
    const problems = staleProposalPathProblems(files, exists, proposalFiles()).join("\n");
    expect(problems).toContain("`src/inputs/product.ts`");
    expect(problems).toContain("`src/flows/invoice-approval`");
    expect(problems).toContain("products/meridian/");
    expect(problems).toContain("`proposals/0009-nook-has-no-disclosure.md`");
    expect(problems).toContain("`proposals/0009-design-loop-graph.md`");
  });

  it("passes the proposals folder, including the pre-0006 paths a merged pull request keeps", () => {
    expect(staleProposalPathProblems(currentProposals(), exists, proposalFiles())).toEqual([]);
  });
});
