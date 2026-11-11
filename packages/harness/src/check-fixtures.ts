import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultExportLiteral, isRecord, parseConfig, requireString, requireStrings, type ParsedConfig } from "./lib/parse-config";
import { checkFile, scripts as packageScripts } from "./lib/scripts";

/**
 * The fixtures are the harness's own tests. fixtures/product is a small
 * product with its own harness config that passes every check. Every other
 * folder directly under fixtures/ or fixtures/illegal/ is a case, and so is
 * the product itself: its case.ts names the paths it replaces in the
 * product's config and the checks to run on the result. A check runs the way
 * a product runs it, as its npm script with `--config`, so a case differs
 * from the product only in what it names.
 *
 * case.ts is plain literals:
 *
 *   export default {
 *     config: { adapter?, paths?: { <key>: path }, shells?, flows? },
 *     base?: { adapter?, paths?, shells?, flows? },
 *     proposals?: "<dir of proposal .md files>",
 *     checks: [{ run: "check:one-thing", args?: ["--list"], fails | passes: "<phrase>" }],
 *   };
 *
 * A fixture has no pull request base, so check:inventories compares it with
 * the product plus `base`'s overrides when the case gives a base, and with
 * the case itself when it does not. A fixture adds no proposal either, so
 * check:inventories reads the .md files in `proposals` as the proposals the
 * change adds.
 *
 * Name cases to run only those: `npm run check:fixtures -- illegal/two-primaries`.
 */

// The harness package's fixtures folder, as seen from the repository root, where the checks run.
const FIXTURES = path.relative(process.cwd(), fileURLToPath(new URL("../fixtures", import.meta.url))).split(path.sep).join("/");
const PRODUCT_CONFIG = `${FIXTURES}/product/harness.config.ts`;
const CONTAINERS = new Set([FIXTURES, `${FIXTURES}/illegal`]);

type Overrides = { adapter?: string; paths?: Record<string, string | string[]>; shells?: unknown; flows?: unknown[] };
type Check = { run: string; args: string[]; expect: "fails" | "passes"; phrase: string };
type Case = { dir: string; config: Overrides; base: Overrides | null; proposals: string | null; checks: Check[] };

function scriptFiles(): Map<string, string> {
  const files = new Map<string, string>();
  for (const [name, command] of Object.entries(packageScripts)) {
    const file = checkFile(command);
    if (file) files.set(name, file);
  }
  return files;
}

function overrides(value: unknown, where: string, product: ParsedConfig): Overrides {
  if (value === undefined) return {};
  if (!isRecord(value)) throw new Error(`${where} must be an object.`);
  const unknown = Object.keys(value).filter((key) => !["adapter", "paths", "shells", "flows"].includes(key));
  if (unknown.length > 0) throw new Error(`${where} has unknown keys: ${unknown.join(", ")}.`);
  const result: Overrides = {};
  if (value.adapter !== undefined) result.adapter = requireString(value, "adapter", where);
  if (value.paths !== undefined) {
    if (!isRecord(value.paths)) throw new Error(`${where}.paths must be an object.`);
    const paths: Record<string, string | string[]> = {};
    for (const key of Object.keys(value.paths)) {
      if (!Object.hasOwn(product.paths, key)) throw new Error(`${where}.paths.${key} is not a config path.`);
      paths[key] = key === "app" ? requireStrings(value.paths, key, `${where}.paths`) : requireString(value.paths, key, `${where}.paths`);
    }
    result.paths = paths;
  }
  // shells replaces the product's rules whole, and writeConfig parses the result.
  if (value.shells !== undefined) result.shells = value.shells;
  if (value.flows !== undefined) {
    if (!Array.isArray(value.flows)) throw new Error(`${where}.flows must be an array.`);
    result.flows = value.flows;
  }
  return result;
}

function parseCase(dir: string, product: ParsedConfig, scripts: Map<string, string>): Case {
  const file = path.join(dir, "case.ts");
  const value = defaultExportLiteral(readFileSync(file, "utf8"), file, "case");
  if (!isRecord(value)) throw new Error(`${file} must export an object.`);
  const unknown = Object.keys(value).filter((key) => !["config", "base", "proposals", "checks"].includes(key));
  if (unknown.length > 0) throw new Error(`${file} has unknown keys: ${unknown.join(", ")}.`);
  if (!Array.isArray(value.checks) || value.checks.length === 0) throw new Error(`${file} must list at least one check.`);
  const checks = value.checks.map((item, index): Check => {
    const where = `${file} checks[${index}]`;
    if (!isRecord(item)) throw new Error(`${where} must be an object.`);
    const run = requireString(item, "run", where);
    if (!scripts.has(run)) throw new Error(`${where}.run "${run}" is not an npm script that runs one check.`);
    const args = item.args === undefined ? [] : requireStrings(item, "args", where);
    if (args.some((arg) => arg === "--config" || arg === "--base" || arg === "--proposals")) {
      throw new Error(`${where}.args may not set --config, --base or --proposals.`);
    }
    if ((item.fails === undefined) === (item.passes === undefined)) throw new Error(`${where} must give exactly one of fails or passes.`);
    const expect = item.fails === undefined ? "passes" : "fails";
    return { run, args, expect, phrase: requireString(item, expect, where) };
  });
  const config = overrides(value.config, `${file} config`, product);
  const base = value.base === undefined ? null : overrides(value.base, `${file} base`, product);
  const proposals = value.proposals === undefined ? null : requireString(value, "proposals", file);
  if (proposals !== null && base === null) throw new Error(`${file} gives proposals but no base, so no change is compared.`);
  // A missing path makes a check crash, and a crash prints the path, so a
  // phrase found in a path could pass a case that never ran its rule.
  const named = [dir, ...pathsIn(config), ...(base ? pathsIn(base) : []), ...(proposals ? [proposals] : [])];
  for (const missing of named.filter((name) => !existsSync(name))) throw new Error(`${file} names ${missing}, which does not exist.`);
  for (const check of checks) {
    const echoed = named.find((name) => name.includes(check.phrase));
    if (echoed) throw new Error(`${file} expects "${check.phrase}", which is part of the path ${echoed}, so it cannot show the rule ran.`);
  }
  return { dir, config, base, proposals, checks };
}

/** Every repo path a case's overrides name. */
function pathsIn(change: Overrides): string[] {
  const found: string[] = [];
  const collect = (value: unknown): void => {
    if (typeof value === "string") found.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (isRecord(value)) Object.values(value).forEach(collect);
  };
  collect(change.adapter);
  collect(change.paths);
  for (const flow of change.flows ?? []) {
    if (!isRecord(flow)) continue;
    collect(flow.states);
    collect(flow.views);
    collect(flow.tasks);
  }
  return found;
}

function caseDirs(): string[] {
  const dirs: string[] = [];
  for (const container of CONTAINERS) {
    for (const entry of readdirSync(container, { withFileTypes: true })) {
      const dir = `${container}/${entry.name}`;
      const isDir = entry.isDirectory() || (entry.isSymbolicLink() && statSync(dir).isDirectory());
      if (isDir && !CONTAINERS.has(dir)) dirs.push(dir);
    }
  }
  const named = process.argv.slice(2).map((name) => `${FIXTURES}/${name.replace(/\/+$/, "")}`);
  const unknown = named.filter((dir) => !dirs.includes(dir));
  if (unknown.length > 0) {
    console.error(`fixtures: no case folder ${unknown.join(", ")}.`);
    process.exit(1);
  }
  return (named.length > 0 ? named : dirs).sort();
}

/** The product's config with a case's overrides, written where a check can read it with --config. */
function writeConfig(product: ParsedConfig, change: Overrides, file: string): string {
  const merged = {
    adapter: change.adapter ?? product.adapter,
    paths: { ...product.paths, ...change.paths },
    shells: change.shells ?? product.shells,
    flows: change.flows ?? product.flows,
  };
  const text = `export default ${JSON.stringify(merged, null, 2)};\n`;
  parseConfig(text, file);
  writeFileSync(file, text);
  return file;
}

const scripts = scriptFiles();
const product = parseConfig(readFileSync(PRODUCT_CONFIG, "utf8"), PRODUCT_CONFIG);
const scratch = mkdtempSync(path.join(tmpdir(), "fixtures-"));
let failed = false;
let ran = 0;

try {
  for (const dir of caseDirs()) {
    if (!existsSync(path.join(dir, "case.ts"))) {
      failed = true;
      console.error(`fixtures: ${dir} has no case.ts, so no check runs it.`);
      continue;
    }
    let testCase: Case;
    try {
      testCase = parseCase(dir, product, scripts);
    } catch (error) {
      failed = true;
      console.error(`fixtures: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const name = path.relative(FIXTURES, dir);
    const slug = `fixtures_${name.replace(/\//g, "_")}`;
    const config = writeConfig(product, testCase.config, path.join(scratch, `${slug}.config.ts`));
    const base = testCase.base ? writeConfig(product, testCase.base, path.join(scratch, `${slug}.base.ts`)) : config;

    for (const check of testCase.checks) {
      ran += 1;
      const extra = check.run === "check:inventories" ? ["--base", base, ...(testCase.proposals ? ["--proposals", testCase.proposals] : [])] : [];
      const args = [scripts.get(check.run) ?? "", ...check.args, "--config", config, ...extra];
      const result = spawnSync(process.execPath, ["--import", "tsx", ...args], { encoding: "utf8" });
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
      const passed = result.status === 0;
      const exitedAsExpected = check.expect === "passes" ? passed : !passed && result.status !== null;
      if (exitedAsExpected && output.includes(check.phrase)) {
        console.log(`fixtures: ${name} ${check.run} ${check.expect === "passes" ? "passed" : "failed"} as required.`);
        continue;
      }
      failed = true;
      console.error(`fixtures: ${name} ${check.run} was expected to ${check.expect === "passes" ? "pass" : "fail"} with "${check.phrase}".`);
      console.error(output.trim() || `(status ${result.status}, signal ${result.signal})`);
    }
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

if (failed) process.exit(1);
console.log(`fixtures: ${ran} checks ran on their cases as required.`);
