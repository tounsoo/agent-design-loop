import { jsonMode, finding, note, reportChecks, type CheckReport } from "./lib/report";
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
 *
 * `--json` runs each check with `--json` and prints one report whose
 * `checks` hold each check's own, in order, with a rule the product opts out
 * of as `skipped` and every check after a failure as `not-run`
 * (lib/report.ts).
 */

const args = process.argv.slice(2).filter((arg) => arg !== "--json");
const jsonFlags = process.argv.length - 2 - args.length;
const index = args.indexOf("--config");
const config = index === -1 ? undefined : args[index + 1];
if (!config || config.startsWith("--") || args.length !== 2 || jsonFlags > 1) {
  console.error("check:product: give the product's config, and nothing else: npm run check:product -- --config <file>.");
  process.exit(1);
}

let app: ServedApp | null = null;
let web: string | null = null;

/** With `--json`: each check's report, in the order they run or are passed over. */
const reports: CheckReport[] = [];
reportChecks(reports);
/** Every check this run would run, in order, once the opt-outs are read. */
let planned: readonly string[] = ["check:opt-outs"];

/** With `--json`, marks every planned check that has no report yet as not run. */
function markNotRun(): void {
  for (const check of planned) if (!reports.some((item) => item.check === check)) reports.push({ check, config: config ?? null, status: "not-run", findings: [] });
}

async function closeApp(): Promise<void> {
  await app?.close();
  app = null;
}

async function stop(code: number): Promise<never> {
  markNotRun();
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
      const message = `check:product: ${check} failed on ${config}: ${error instanceof Error ? error.message : String(error)}`;
      if (jsonMode) {
        reports.push({ check, config: config ?? null, status: "fail", findings: [finding(message)] });
        note(message);
      } else console.error(message);
      await stop(1);
    }
  }
  const script = checkFile(scripts[check] ?? "") ?? "";
  console.log(`check:product: ${check}`);
  const env = app === null || web === null ? process.env : { ...process.env, [APP_URL_ENV]: app.url, [APP_WEB_ENV]: path.resolve(web) };
  // Asynchronous, so the app this process serves keeps answering while the check runs.
  let stdout = "";
  const status = await new Promise<number | null>((resolve) => {
    const child = jsonMode
      ? spawn(process.execPath, ["--import", "tsx", script, "--config", config ?? "", "--json"], { stdio: ["inherit", "pipe", "inherit"], env })
      : spawn(process.execPath, ["--import", "tsx", script, "--config", config ?? ""], { stdio: "inherit", env });
    child.stdout?.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.on("error", () => resolve(null));
    // With --json, its report is whole only once its stdout closes.
    child.on(jsonMode ? "close" : "exit", (code) => resolve(code));
  });
  if (jsonMode) reports.push(childReport(check, status, stdout));
  if (status !== 0) {
    if (jsonMode) note(`check:product: ${check} failed on ${config}.`);
    else console.error(`check:product: ${check} failed on ${config}.`);
    await stop(1);
  }
}

/** A check's own `--json` report, held to its exit status, or a failure that says it printed none. */
function childReport(check: string, status: number | null, stdout: string): CheckReport {
  try {
    const report = JSON.parse(stdout) as CheckReport;
    if (report.check === check && (report.status === "pass") === (status === 0)) return report;
  } catch {
    // Not JSON: reported below.
  }
  const reason = status === null ? "did not start" : `exited with status ${status}`;
  return { check, config: config ?? null, status: status === 0 ? "pass" : "fail", findings: status === 0 ? [] : [finding(`check:product: ${check} ${reason} and printed no report.`)] };
}

planned = ["check:opt-outs", ...ruleChecks()];
await run("check:opt-outs");
const parsed = parseConfig(readFileSync(config, "utf8"), config);
web = parsed.paths.web;
const checks = ruleChecks();
let skipped = 0;
for (const check of checks) {
  const proposal = parsed.optOuts[check];
  if (proposal !== undefined) {
    skipped += 1;
    reports.push({ check, config, status: "skipped", findings: [], optOut: proposal });
    console.log(`check:product: skipped ${check}, which this product opts out of in ${proposal}.`);
    continue;
  }
  await run(check);
}
await closeApp();

const ran = checks.length - skipped;
console.log(`check:product: ${ran} checks passed on ${config}${skipped > 0 ? `, ${skipped} opted out` : ""}.`);
