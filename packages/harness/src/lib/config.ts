import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseConfig, type LoadedConfig, type ProductInputs, type UxRules } from "./parse-config";

export * from "./parse-config";

/**
 * The checks read a product's paths from its harness config, named with
 * `--config`, not from constants of their own. The checks run from the
 * repository root, and paths in a config are relative to it.
 *
 * The file stays plain literals: check:inventories parses it at the pull
 * request base with `git show`, where it cannot run imports. A change to it
 * is an inventory change, so it needs a proposal like any other.
 */

/**
 * The flags a check reads besides `--config`. A flag no check reads is an
 * error, not ignored, so a stale invocation cannot pass on the wrong product.
 */
const CHECK_FLAGS: Record<string, readonly string[]> = {
  "check-inventories.ts": ["--base", "--proposals", "--base-proposals"],
  "check-target-size.ts": ["--list"],
  "check-accessible-names.ts": ["--list"],
  "screenshots.ts": ["--out", "--state", "--base", "--pin"],
};

function rejectUnknownFlags(): void {
  const script = path.basename(process.argv[1] ?? "");
  const known = new Set(["--config", ...(CHECK_FLAGS[script] ?? [])]);
  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith("--")) continue;
    const name = arg.split("=")[0] ?? arg;
    if (!known.has(name)) throw new Error(`${script} does not read ${name}. It reads ${[...known].join(", ")}.`);
    if (arg.includes("=")) throw new Error(`write ${name} <value>, not ${name}=<value>.`);
  }
}

/**
 * `--config <file>` names the product a run checks, which is also how the
 * fixtures give a check a product of their own. Paths inside it are relative
 * to the repository root.
 */
function configFile(): string {
  rejectUnknownFlags();
  const index = process.argv.indexOf("--config");
  if (index === -1) throw new Error("give the product's config: --config <file>, for example products/meridian/harness.config.ts.");
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error("missing --config path.");
  return value;
}

function loadConfig(): { name: string; config: LoadedConfig } {
  try {
    const name = configFile();
    const file = path.resolve(name);
    if (!existsSync(file)) {
      throw new Error(`${name} is missing. Run the checks from the repository root.`);
    }
    const parsed = parseConfig(readFileSync(file, "utf8"), name);
    const { adapter, paths, shells } = parsed;
    if (adapter === null) throw new Error("config.adapter must name the design system adapter module.");
    if (paths.web === null) throw new Error("config.paths.web must name the directory with the product's index.html.");
    if (shells === null) throw new Error("config.shells must give primarySlots and collections.");
    return { name, config: { ...parsed, adapter, paths: { ...paths, web: paths.web }, shells } };
  } catch (error) {
    console.error(`harness config: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

const loaded = loadConfig();

/** The product's config, read from the working directory or from `--config`. */
export const config: LoadedConfig = loaded.config;

/** The config file this run read, as `--config` names it. */
export const configName: string = loaded.name;

/** The page-type barrel, which declares the page types the app renders. */
export const pageTypesBarrel = path.join(config.paths.pageTypes, "index.ts");

/** Directories that own page CSS: layouts, content layouts and page-type shells. */
export const styleOwnerDirs = [config.paths.contentLayouts, config.paths.layouts, config.paths.pageTypes];

/** Product UI the off-catalog lint reads, the catalog's own directory last. */
export const uiRoots = [
  config.paths.features,
  config.paths.pageTypes,
  config.paths.layouts,
  config.paths.contentLayouts,
  ...config.paths.app,
  path.dirname(config.paths.catalog),
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The member id an import specifier names inside an inventory directory: `../content-layouts/data-table` gives data-table. */
export function memberOf(specifier: string, dir: string): string | null {
  const match = new RegExp(`(?:^|/)${escapeRegExp(path.basename(dir))}/([^/"']+)`).exec(specifier);
  return match?.[1] ?? null;
}

/** True when an import specifier points into an inventory directory. */
export function importsFrom(specifier: string, dir: string): boolean {
  return new RegExp(`(?:^|/)${escapeRegExp(path.basename(dir))}/`).test(specifier);
}

async function loadModule(file: string, names: readonly string[], label: string): Promise<Record<string, unknown>> {
  const module = (await import(pathToFileURL(path.resolve(file)).href)) as Record<string, unknown>;
  const missing = names.filter((name) => module[name] === undefined);
  if (missing.length > 0) {
    console.error(`harness config: ${label} ${file} does not export ${missing.join(", ")}.`);
    process.exit(1);
  }
  return module;
}

/** Imports the product inputs module that the config names. */
export async function loadInputs(): Promise<ProductInputs> {
  const names = ["tasks", "priority", "disclosed_sections", "allowed_page_types", "allowed_layouts"];
  return (await loadModule(config.paths.inputs, names, "paths.inputs")) as unknown as ProductInputs;
}

/** Imports the UX rules module that the config names. */
export async function loadRules(): Promise<UxRules> {
  const names = ["MAX_DISCLOSURE_DEPTH", "MAX_DISCLOSURES_PER_PAGE", "MAX_VISIBLE_QUESTIONS", "TARGET_MIN_PX"];
  return (await loadModule(config.paths.rules, names, "paths.rules")) as unknown as UxRules;
}
