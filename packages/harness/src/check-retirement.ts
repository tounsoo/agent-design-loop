import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { retirementCandidates, RETIREMENT_MIN_PRODUCTS, type OptOutProduct } from "./lib/opt-outs";
import { parseConfig } from "./lib/parse-config";

/**
 * Reads every product's harness config in the repository and fails when a
 * rule is opted out of by a majority of products, and by at least two. A rule
 * most products turn off is not a shared rule: retire it with a proposal that
 * takes it out of `check:rules`, or withdraw an opt-out. A product is any
 * `harness.config.ts` git knows of, tracked or new, outside the harness
 * package, whose fixtures are not products.
 */

if (process.argv.length > 2) {
  console.error("check:retirement takes no arguments. It reads every product's harness.config.ts.");
  process.exit(1);
}

const harnessDir = path.relative(process.cwd(), path.dirname(path.dirname(fileURLToPath(import.meta.url)))).split(path.sep).join("/");

function productConfigs(): string[] {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" });
  return output
    .split("\n")
    .filter((file) => path.posix.basename(file) === "harness.config.ts" && !file.startsWith(`${harnessDir}/`))
    .sort();
}

const files = productConfigs();
if (files.length === 0) {
  console.error("retirement: found no harness.config.ts outside the harness package.");
  process.exit(1);
}

const products: OptOutProduct[] = files.map((file) => {
  const parsed = parseConfig(readFileSync(file, "utf8"), file);
  return { source: parsed.paths.source, proposals: parsed.paths.proposals, optOuts: parsed.optOuts };
});
const candidates = retirementCandidates(products);

if (candidates.length > 0) {
  console.error("retirement: these rules are opted out of by most products, so they are flagged for retirement:");
  for (const candidate of candidates) {
    console.error(`- ${candidate.rule}: opted out by ${candidate.products.length} of ${candidate.of} products (${candidate.products.join(", ")}).`);
  }
  console.error("Retire a rule with a decided proposal that takes it out of check:rules, or withdraw an opt-out.");
  process.exit(1);
}

const optedOut = products.reduce((total, product) => total + Object.keys(product.optOuts).length, 0);
console.log(
  `retirement: no rule is opted out by a majority of ${products.length} products (at least ${RETIREMENT_MIN_PRODUCTS}); ${optedOut} opt-outs in all.`,
);
