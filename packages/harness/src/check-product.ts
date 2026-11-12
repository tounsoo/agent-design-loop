import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseConfig } from "./lib/parse-config";
import { checkFile, ruleChecks, scripts } from "./lib/scripts";
import { APP_CHECKS, APP_URL_ENV, APP_WEB_ENV, serveApp, type ServedApp } from "./lib/served-app";

/**
 * Runs every rule check on one product: `npm run check:product -- --config
 * products/nook/harness.config.ts`. The checks are the ones `npm run
 * check:rules` lists, in its order, read from package.json so the two lists
 * cannot drift. Each gets the same `--config`. Typecheck, ESLint and the
 * Vitest suite read the whole repository, so `npm run check` runs them once
 * and then this script once for every product (check:products).
 *
 * check:opt-outs runs first. A rule the product opts out of is skipped only
 * after it passes, so every skip stands on a decided proposal.
 *
 * The checks that open the app in Chrome share one build of it, served on a
 * free port (lib/served-app.ts). It is built just before the first of them,
 * so a product whose code fails a cheaper check hears that first.
 */

const args = process.argv.slice(2);
const index = args.indexOf("--config");
const config = index === -1 ? undefined : args[index + 1];
if (!config || config.startsWith("--") || args.length !== 2) {
  console.error("check:product: give the product's config, and nothing else: npm run check:product -- --config <file>.");
  process.exit(1);
}

let app: ServedApp | null = null;
let web: string | null = null;

async function closeApp(): Promise<void> {
  await app?.close();
  app = null;
}

async function stop(code: number): Promise<never> {
  await closeApp();
  process.exit(code);
}

async function run(check: string): Promise<void> {
  if (APP_CHECKS.has(check) && app === null && web !== null) {
    console.log(`check:product: building ${web} once for the checks that open it in Chrome.`);
    try {
      app = await serveApp(web);
      console.log(`check:product: serving it at ${app.url}`);
    } catch (error) {
      console.error(`check:product: ${check} failed on ${config}: ${error instanceof Error ? error.message : String(error)}`);
      await stop(1);
    }
  }
  const script = checkFile(scripts[check] ?? "") ?? "";
  console.log(`check:product: ${check}`);
  const env = app === null || web === null ? process.env : { ...process.env, [APP_URL_ENV]: app.url, [APP_WEB_ENV]: path.resolve(web) };
  // Asynchronous, so the app this process serves keeps answering while the check runs.
  const status = await new Promise<number | null>((resolve) => {
    const child = spawn(process.execPath, ["--import", "tsx", script, "--config", config ?? ""], { stdio: "inherit", env });
    child.on("error", () => resolve(null));
    child.on("exit", (code) => resolve(code));
  });
  if (status !== 0) {
    console.error(`check:product: ${check} failed on ${config}.`);
    await stop(1);
  }
}

await run("check:opt-outs");
const parsed = parseConfig(readFileSync(config, "utf8"), config);
web = parsed.paths.web;
const checks = ruleChecks();
let skipped = 0;
for (const check of checks) {
  const proposal = parsed.optOuts[check];
  if (proposal !== undefined) {
    skipped += 1;
    console.log(`check:product: skipped ${check}, which this product opts out of in ${proposal}.`);
    continue;
  }
  await run(check);
}
await closeApp();

const ran = checks.length - skipped;
console.log(`check:product: ${ran} checks passed on ${config}${skipped > 0 ? `, ${skipped} opted out` : ""}.`);
