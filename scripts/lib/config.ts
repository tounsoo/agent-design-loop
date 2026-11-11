import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

/**
 * The checks read a product's paths from harness.config.ts at the repository
 * root, not from constants of their own. Paths are relative to the root.
 *
 * The file stays plain literals: check:inventories parses it at the pull
 * request base with `git show`, where it cannot run imports. A change to it
 * is an inventory change, so it needs a proposal like any other.
 */

export const CONFIG_FILE = "harness.config.ts";

export type FlowConfig = {
  /** Module exporting the flow's `modeledStates`. */
  readonly states: string;
  /** Module with a `case` for each modeled state. */
  readonly views: string;
};

export type HarnessConfig = {
  readonly paths: {
    /** Everything the inventory import scan reads. */
    readonly source: string;
    /** Product screens: where page-type shells are rendered. */
    readonly features: string;
    /** Chrome layouts, one directory per allowed_layouts id. */
    readonly layouts: string;
    /** Content layouts, one directory per allowed_content_layouts id. */
    readonly contentLayouts: string;
    /** Page-type shells, one directory per allowed_page_types id, with an index.ts barrel. */
    readonly pageTypes: string;
    /** Flows, one directory per flow; a graph.ts there is a task graph. */
    readonly flows: string;
    /** The one module product UI imports components from. */
    readonly catalog: string;
    /** Product inputs: tasks, priority, disclosed sections and the allowed lists. */
    readonly inputs: string;
    /** UX rule caps. */
    readonly rules: string;
    /** Product stylesheet. */
    readonly styles: string;
    /** Other product UI the off-catalog lint reads: entry files and preview code. */
    readonly app: readonly string[];
  };
  readonly flows: readonly FlowConfig[];
};

/** What the checks read from the product inputs module. */
export type ProductInputs = {
  readonly tasks: readonly { readonly id: string; readonly success_state: string; readonly max_steps: number }[];
  readonly priority: readonly { readonly action: string; readonly rank: number; readonly level: string }[];
  readonly disclosed_sections: readonly string[];
  readonly allowed_page_types: readonly string[];
  readonly allowed_layouts: readonly string[];
};

/** What the checks read from the UX rules module. */
export type UxRules = {
  readonly MAX_DISCLOSURE_DEPTH: number;
  readonly MAX_DISCLOSURES_PER_PAGE: number;
  readonly MAX_VISIBLE_QUESTIONS: number;
  readonly TARGET_MIN_PX: number;
};

type Literal = string | number | boolean | readonly Literal[] | { readonly [key: string]: Literal };

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isAsExpression(current) || ts.isSatisfiesExpression(current) || ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

function literal(node: ts.Expression, where: string): Literal {
  const value = unwrap(node);
  if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text;
  if (ts.isNumericLiteral(value)) return Number(value.text.replace(/_/g, ""));
  if (value.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (value.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(value)) return value.elements.map((element, index) => literal(element, `${where}[${index}]`));
  if (ts.isObjectLiteralExpression(value)) {
    const record: Record<string, Literal> = {};
    for (const property of value.properties) {
      if (!ts.isPropertyAssignment(property) || !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) {
        throw new Error(`${where} must use plain key: value properties.`);
      }
      record[property.name.text] = literal(property.initializer, `${where}.${property.name.text}`);
    }
    return record;
  }
  throw new Error(`${where} must be a plain literal, not computed.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, key: string, where: string): string {
  const value = record[key];
  if (typeof value !== "string" || value === "") throw new Error(`${where}.${key} must be a non-empty string.`);
  return value;
}

function requireStrings(record: Record<string, unknown>, key: string, where: string): string[] {
  const value = record[key];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item !== "")) {
    throw new Error(`${where}.${key} must be an array of non-empty strings.`);
  }
  return value as string[];
}

/** Parses harness.config.ts source text. Throws when it is not plain literals or misses a field. */
export function parseConfig(text: string, label = CONFIG_FILE): HarnessConfig {
  const source = ts.createSourceFile(label, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const exported = source.statements.find(
    (statement): statement is ts.ExportAssignment => ts.isExportAssignment(statement) && !statement.isExportEquals,
  );
  if (!exported) throw new Error(`${label} has no default export.`);
  const value = literal(exported.expression, "config");
  if (!isRecord(value) || !isRecord(value.paths)) throw new Error(`${label} must export { paths, flows }.`);
  const paths = value.paths;
  if (!Array.isArray(value.flows) || value.flows.length === 0) throw new Error("config.flows must list at least one flow.");
  return {
    paths: {
      source: requireString(paths, "source", "config.paths"),
      features: requireString(paths, "features", "config.paths"),
      layouts: requireString(paths, "layouts", "config.paths"),
      contentLayouts: requireString(paths, "contentLayouts", "config.paths"),
      pageTypes: requireString(paths, "pageTypes", "config.paths"),
      flows: requireString(paths, "flows", "config.paths"),
      catalog: requireString(paths, "catalog", "config.paths"),
      inputs: requireString(paths, "inputs", "config.paths"),
      rules: requireString(paths, "rules", "config.paths"),
      styles: requireString(paths, "styles", "config.paths"),
      app: requireStrings(paths, "app", "config.paths"),
    },
    flows: value.flows.map((flow, index) => {
      const where = `config.flows[${index}]`;
      if (!isRecord(flow)) throw new Error(`${where} must be an object.`);
      return { states: requireString(flow, "states", where), views: requireString(flow, "views", where) };
    }),
  };
}

function loadConfig(): HarnessConfig {
  const file = path.resolve(CONFIG_FILE);
  try {
    if (!existsSync(file)) throw new Error(`${CONFIG_FILE} is missing. Run the checks from the repository root.`);
    return parseConfig(readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`harness config: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/** The product's config, read from the working directory. */
export const config: HarnessConfig = loadConfig();

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
