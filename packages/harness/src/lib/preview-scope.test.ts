import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { previewScopeProblems } from "./preview-scope";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const APP = "products/meridian/App.tsx";
const PAGE = "products/meridian/features/invoice-approval/InvoiceApproval.tsx";

function show(rev: string, file: string): string {
  return execFileSync("git", ["show", `${rev}:${file}`], { cwd: repoRoot, encoding: "utf8" });
}

function pair(rev: string): Map<string, string> {
  return new Map([
    [APP, show(rev, APP)],
    [PAGE, show(rev, PAGE)],
  ]);
}

function currentPages(): Map<string, string> {
  const files = new Map<string, string>();
  const skip = new Set(["node_modules", "dist", "coverage", ".cache", ".git"]);
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
        continue;
      }
      if (!entry.name.endsWith(".tsx")) continue;
      files.set(path.relative(repoRoot, full).split(path.sep).join("/"), readFileSync(full, "utf8"));
    }
  };
  visit(path.join(repoRoot, "products"));
  return files;
}

describe("preview-scope", () => {
  it("fails the title and the page from before 3a3c7d7, where the title searched every known vendor and the page searched the preview", () => {
    const problems = previewScopeProblems(pair("3a3c7d7^")).join("\n");
    expect(problems).toContain("knownVendors().find");
    expect(problems).toContain("shownVendors.some (previewVendors)");
    expect(problems).toContain("openVendor");
  });

  it("fails the title at 3a3c7d7, which searched previewVendors and so missed a vendor once the link left the preview", () => {
    const problems = previewScopeProblems(pair("3a3c7d7")).join("\n");
    expect(problems).toContain("previewVendors().find");
    expect(problems).toContain("openVendor");
  });

  it("passes the pages, which open a vendor with openVendor", () => {
    expect(previewScopeProblems(currentPages())).toEqual([]);
  });
});
