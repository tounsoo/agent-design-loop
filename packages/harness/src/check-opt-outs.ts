import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { config, configName } from "./lib/config";
import { optOutProblems } from "./lib/opt-outs";
import { ruleChecks } from "./lib/scripts";

/**
 * Every harness rule applies to every product unless the product's config
 * opts out of it, and each opt-out needs an adopted proposal that names the
 * rule and the product. check:product runs this before any rule check, so it
 * skips a rule only on an opt-out that passed here.
 */

const product = { source: config.paths.source, proposals: config.paths.proposals, optOuts: config.optOuts };
const read = (file: string): string | null => (existsSync(path.resolve(file)) ? readFileSync(path.resolve(file), "utf8") : null);
const problems = optOutProblems(product, ruleChecks(), read);

if (problems.length > 0) {
  console.error(`opt-outs: ${configName} opts out of rules without an adopted proposal:`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

const rules = Object.keys(config.optOuts);
console.log(
  rules.length === 0
    ? `opt-outs: ${config.paths.source} has no opt-outs, so every harness rule applies.`
    : `opt-outs: ${config.paths.source} opts out of ${rules.join(", ")}, each on an adopted proposal.`,
);
