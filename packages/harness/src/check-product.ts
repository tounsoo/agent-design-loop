import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseConfig } from "./lib/parse-config";
import { checkFile, ruleChecks, scripts } from "./lib/scripts";

/**
 * Runs every rule check on one product: `npm run check:product -- --config
 * products/nook/harness.config.ts`. The checks are the ones `npm run
 * check:rules` lists, in its order, read from package.json so the two lists
 * cannot drift. Each gets the same `--config`. Typecheck, ESLint and the
 * Vitest suite read the whole repository, so `npm run check` runs them once
 * and then this script once for every product.
 *
 * check:opt-outs runs first. A rule the product opts out of is skipped only
 * after it passes, so every skip stands on a decided proposal.
 */

const args = process.argv.slice(2);
const index = args.indexOf("--config");
const config = index === -1 ? undefined : args[index + 1];
if (!config || config.startsWith("--") || args.length !== 2) {
  console.error("check:product: give the product's config, and nothing else: npm run check:product -- --config <file>.");
  process.exit(1);
}

function run(check: string): void {
  const script = checkFile(scripts[check] ?? "") ?? "";
  console.log(`check:product: ${check}`);
  const result = spawnSync(process.execPath, ["--import", "tsx", script, "--config", config ?? ""], { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`check:product: ${check} failed on ${config}.`);
    process.exit(1);
  }
}

run("check:opt-outs");
const { optOuts } = parseConfig(readFileSync(config, "utf8"), config);
const checks = ruleChecks();
let skipped = 0;
for (const check of checks) {
  const proposal = optOuts[check];
  if (proposal !== undefined) {
    skipped += 1;
    console.log(`check:product: skipped ${check}, which this product opts out of in ${proposal}.`);
    continue;
  }
  run(check);
}

const ran = checks.length - skipped;
console.log(`check:product: ${ran} checks passed on ${config}${skipped > 0 ? `, ${skipped} opted out` : ""}.`);
