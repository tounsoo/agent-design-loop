import { previewScopeProblems } from "./lib/preview-scope";
import { reportProblems, repoFiles } from "./lib/repo-text";

/**
 * Fails a page or a document title that resolves a vendor id by searching
 * knownVendors, previewVendors, vendorDirectory, or a list taken from one.
 */

const args = process.argv.slice(2);
if (args.length > 0) {
  console.error("check:preview-scope takes no arguments.");
  process.exit(1);
}

const root = process.cwd();
const files = repoFiles(root, (rel) => rel.endsWith(".tsx"), "products");
reportProblems(
  previewScopeProblems(files),
  "preview-scope: a page resolves a vendor id outside openVendor:",
  "preview-scope: the page and the document title open a vendor with openVendor.",
);
