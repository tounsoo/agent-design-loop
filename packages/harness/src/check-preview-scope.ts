import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { previewScopeProblems } from "./lib/preview-scope";

/**
 * Fails a page or a document title that resolves a vendor id with
 * knownVendors or previewVendors. openVendor is the lookup both use, so a
 * preview-only vendor is not titled from one list and opened from another.
 */

const args = process.argv.slice(2);
if (args.length > 0) {
  console.error("check:preview-scope takes no arguments.");
  process.exit(1);
}

const SKIP = new Set(["node_modules", "dist", "coverage", ".cache", ".git", ".vite"]);
const root = process.cwd();

function collect(dir: string, files: Map<string, string>): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collect(full, files);
      continue;
    }
    if (!entry.name.endsWith(".tsx")) continue;
    const rel = path.relative(root, full).split(path.sep).join("/");
    files.set(rel, readFileSync(full, "utf8"));
  }
}

const files = new Map<string, string>();
const products = path.join(root, "products");
collect(products, files);
const problems = previewScopeProblems(files);
if (problems.length > 0) {
  console.error("preview-scope: a page resolves a vendor id outside openVendor:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log("preview-scope: the page and the document title open a vendor with openVendor.");
