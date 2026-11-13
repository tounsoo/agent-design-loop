import ts from "typescript";

/**
 * A harness config's shape, and the parser that reads one from its source
 * text without running it. Loading the config a check runs on is config.ts.
 */

export type FlowConfig = {
  /** Module exporting the flow's `modeledStates`. */
  readonly states: string;
  /** Module with a `case` for each modeled state. */
  readonly views: string;
  /**
   * Task id in the product inputs' tasks → the task graph module that models
   * it. check:step-budget measures every task through the module named here.
   * It names a flow state by its `status` field, or by `flowStatus(state)`
   * when the module exports one.
   */
  readonly tasks?: { readonly [taskId: string]: string };
};

/**
 * What a page type's shell slots mean to the checks, by allowed_page_types id.
 * The shell itself is whatever the page type's module exports, so the checks
 * hold no shell or slot names of their own.
 */
export type ShellRules = {
  /**
   * Page type → the slot on its shell that holds the page's one primary
   * action: `{ detail: "Primary" }` means `<DetailPage.Primary>`. lint:slots
   * requires every page of the type to fill it with exactly one primary action,
   * and each type named here to render at least one page. The slot must be
   * one the shell defines as `Object.assign(Root, { ... })`.
   */
  readonly primarySlots: { readonly [pageType: string]: string };
  /**
   * Page type → its shell's chrome slots, for page types that are collections.
   * Every other slot is body. Every page's body, a collection's included, is
   * built from registered content layouts (check:inventories), and a collection page holds no primary
   * action (check:one-thing). A product with no collection names none. Each
   * slot named must be one the shell defines, as in primarySlots.
   */
  readonly collections: { readonly [pageType: string]: readonly string[] };
  /**
   * Page types whose pages are content: they show information, such as a
   * help, overview or settings summary page. No page of a content page type
   * holds a primary button, outside the shared chrome layouts (check:one-thing).
   * Optional: a product with no content page type leaves it out.
   */
  readonly content?: readonly string[];
  /**
   * Page type → its shell's chrome slots, for page types under primarySlots
   * or content. A collection names its chrome in its own entry. The primary
   * slot is always chrome. Every other slot is body: a page's body is built
   * only from registered content layouts and the adapter's status parts
   * (check:inventories), so a new block on a page is a new content layout,
   * which takes a proposal. A page type with no entry here has no chrome but
   * its primary slot. Optional: a config written before this rule leaves it
   * out, and check:inventories then skips comparing it with the base once.
   */
  readonly chrome?: { readonly [pageType: string]: readonly string[] };
};

export type HarnessConfig = {
  /** The design system adapter module: the names the checks look for. See lib/adapter.ts. */
  readonly adapter: string;
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
    /** The one module product UI imports components from. */
    readonly catalog: string;
    /** Product inputs: tasks, priority, disclosed sections and the allowed lists. Task graphs are under flows[].tasks. */
    readonly inputs: string;
    /** UX rule caps. */
    readonly rules: string;
    /** Product stylesheet. */
    readonly styles: string;
    /** Other product UI the off-catalog lint reads: entry files and the code that renders a scenario. */
    readonly app: readonly string[];
    /** The directory with the product's index.html, which check:target-size and check:accessible-names build and serve with Vite. */
    readonly web: string;
    /** The folder check:opt-outs requires an opt-out's proposal to sit in, and check:inventories reads adopted proposals from. Defaults to `proposals`. */
    readonly proposals?: string;
  };
  readonly shells: ShellRules;
  readonly flows: readonly FlowConfig[];
  /**
   * Harness rules this product does not follow: rule → the adopted proposal
   * that says why, under `paths.proposals`. A rule is a check that
   * `check:rules` in package.json lists, such as `check:disclosure`.
   * check:product skips it for this product, and check:opt-outs fails when the
   * proposal is missing, not adopted, or does not list the rule for this
   * product under `opts-out`.
   */
  readonly optOuts?: { readonly [rule: string]: string };
};

/** A config as the checks read it, with the defaults filled in. */
export type LoadedConfig = Omit<HarnessConfig, "paths" | "optOuts"> & {
  readonly paths: HarnessConfig["paths"] & { readonly proposals: string };
  readonly optOuts: { readonly [rule: string]: string };
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

export type Literal = string | number | boolean | readonly Literal[] | { readonly [key: string]: Literal };

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isAsExpression(current) || ts.isSatisfiesExpression(current) || ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

export function literal(node: ts.Expression, where: string): Literal {
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
      if (Object.hasOwn(record, property.name.text)) throw new Error(`${where}.${property.name.text} is set twice.`);
      // defineProperty, so a key like __proto__ is an own key the field checks see, not the record's prototype.
      Object.defineProperty(record, property.name.text, {
        value: literal(property.initializer, `${where}.${property.name.text}`),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return record;
  }
  throw new Error(`${where} must be a plain literal, not computed.`);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function requireString(record: Record<string, unknown>, key: string, where: string): string {
  const value = record[key];
  if (typeof value !== "string" || value === "") throw new Error(`${where}.${key} must be a non-empty string.`);
  return value;
}

function stringRecord(record: Record<string, unknown>, key: string, where: string): Record<string, string> {
  const value = record[key];
  if (value === undefined) return {};
  if (!isRecord(value)) throw new Error(`${where}.${key} must be an object.`);
  for (const [name, item] of Object.entries(value)) {
    if (typeof item !== "string" || item === "") throw new Error(`${where}.${key}.${name} must be a non-empty string.`);
  }
  return value as Record<string, string>;
}

function stringListRecord(record: Record<string, unknown>, key: string, where: string): Record<string, string[]> {
  const value = record[key];
  if (value === undefined) return {};
  if (!isRecord(value)) throw new Error(`${where}.${key} must be an object.`);
  const lists: Record<string, string[]> = {};
  for (const name of Object.keys(value)) lists[name] = requireStrings(value, name, `${where}.${key}`);
  return lists;
}

export function requireStrings(record: Record<string, unknown>, key: string, where: string): string[] {
  const value = record[key];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item !== "")) {
    throw new Error(`${where}.${key} must be an array of non-empty strings.`);
  }
  return value as string[];
}

/** The default export of a plain-literal module, read from its source text without running it. */
export function defaultExportLiteral(text: string, label: string, where: string): Literal {
  const source = ts.createSourceFile(label, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const defaults = source.statements.filter(
    (statement): statement is ts.ExportAssignment => ts.isExportAssignment(statement) && !statement.isExportEquals,
  );
  const exported = defaults[0];
  if (!exported || defaults.length > 1) throw new Error(`${label} must have exactly one default export.`);
  return literal(exported.expression, where);
}

/**
 * A config as parsed. A field is null in a config written before it existed:
 * adapter before the adapter, paths.web and shells before the second product.
 * check:inventories reads such a config at the pull request base.
 */
export type ParsedConfig = Omit<LoadedConfig, "adapter" | "paths" | "shells"> & {
  readonly adapter: string | null;
  readonly paths: Omit<LoadedConfig["paths"], "web"> & { readonly web: string | null };
  readonly shells: ShellRules | null;
};

/** Where proposals live when a config does not say. */
export const DEFAULT_PROPOSALS = "proposals";

function parseShells(value: unknown, where: string): ShellRules | null {
  if (value === undefined) return null;
  if (!isRecord(value)) throw new Error(`${where} must be an object.`);
  const unknown = Object.keys(value).filter((key) => !["primarySlots", "collections", "content", "chrome"].includes(key));
  if (unknown.length > 0) throw new Error(`${where} has unknown keys: ${unknown.join(", ")}.`);
  // Both are required, so a product says it has no collection rather than leaving it out. content came later, so a config without it still reads.
  if (!isRecord(value.primarySlots)) throw new Error(`${where}.primarySlots must be an object.`);
  if (!isRecord(value.collections)) throw new Error(`${where}.collections must be an object.`);
  const rules = { primarySlots: stringRecord(value, "primarySlots", where), collections: stringListRecord(value, "collections", where) };
  const content = value.content === undefined ? {} : { content: requireStrings(value, "content", where) };
  // chrome came later still, so a config without it reads too.
  const chrome = value.chrome === undefined ? {} : { chrome: stringListRecord(value, "chrome", where) };
  return { ...rules, ...content, ...chrome };
}

/** Parses a harness config's source text. Throws when it is not plain literals or misses a field. */
export function parseConfig(text: string, label: string): ParsedConfig {
  const value = defaultExportLiteral(text, label, "config");
  if (!isRecord(value) || !isRecord(value.paths)) throw new Error(`${label} must export { adapter, paths, shells, flows }.`);
  const paths = value.paths;
  if (!Array.isArray(value.flows) || value.flows.length === 0) throw new Error("config.flows must list at least one flow.");
  return {
    adapter: value.adapter === undefined ? null : requireString(value, "adapter", "config"),
    paths: {
      source: requireString(paths, "source", "config.paths"),
      features: requireString(paths, "features", "config.paths"),
      layouts: requireString(paths, "layouts", "config.paths"),
      contentLayouts: requireString(paths, "contentLayouts", "config.paths"),
      pageTypes: requireString(paths, "pageTypes", "config.paths"),
      catalog: requireString(paths, "catalog", "config.paths"),
      inputs: requireString(paths, "inputs", "config.paths"),
      rules: requireString(paths, "rules", "config.paths"),
      styles: requireString(paths, "styles", "config.paths"),
      app: requireStrings(paths, "app", "config.paths"),
      web: paths.web === undefined ? null : requireString(paths, "web", "config.paths"),
      proposals: paths.proposals === undefined ? DEFAULT_PROPOSALS : requireString(paths, "proposals", "config.paths"),
    },
    shells: parseShells(value.shells, "config.shells"),
    flows: value.flows.map((flow, index) => {
      const where = `config.flows[${index}]`;
      if (!isRecord(flow)) throw new Error(`${where} must be an object.`);
      // tasks is optional so a base written before it still parses. A base's
      // previews, from before scenarios, are not read: scenarios.ts beside the
      // states module lists what the checks open.
      return {
        states: requireString(flow, "states", where),
        views: requireString(flow, "views", where),
        tasks: stringRecord(flow, "tasks", where),
      };
    }),
    optOuts: stringRecord(value, "optOuts", "config"),
  };
}

