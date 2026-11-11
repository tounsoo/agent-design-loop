import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * Runs every rule check on one product: `npm run check:product -- --config
 * products/nook/harness.config.ts`. The checks are the ones `npm run check`
 * runs as `tsx scripts/...`, in the same order, read from package.json so the
 * two lists cannot drift. Each gets the same `--config`. Typecheck, ESLint
 * and the Vitest suite read the whole repository, so `npm run check` runs
 * them once for every product.
 */

const scripts = (JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> }).scripts;

function ruleChecks(name: string, seen: Set<string>): string[] {
  const command = scripts[name];
  if (command === undefined) throw new Error(`package.json has no script "${name}".`);
  if (seen.has(name)) throw new Error(`package.json script "${name}" runs itself.`);
  const found: string[] = [];
  for (const part of command.split("&&").map((step) => step.trim())) {
    const nested = /^npm run ([\w:-]+)$/.exec(part);
    if (nested?.[1]) found.push(...ruleChecks(nested[1], new Set([...seen, name])));
    else if (/^tsx scripts\/[\w-]+\.ts$/.test(part)) found.push(name);
  }
  return found;
}

const args = process.argv.slice(2);
const index = args.indexOf("--config");
const config = index === -1 ? undefined : args[index + 1];
if (!config || config.startsWith("--") || args.length !== 2) {
  console.error("check:product: give the product's config, and nothing else: npm run check:product -- --config <file>.");
  process.exit(1);
}

const checks = ruleChecks("check", new Set());
for (const check of checks) {
  const script = /^tsx (scripts\/[\w-]+\.ts)$/.exec(scripts[check] ?? "")?.[1] ?? "";
  console.log(`check:product: ${check}`);
  const result = spawnSync(process.execPath, ["--import", "tsx", script, "--config", config], { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`check:product: ${check} failed on ${config}.`);
    process.exit(1);
  }
}

console.log(`check:product: ${checks.length} checks passed on ${config}.`);
