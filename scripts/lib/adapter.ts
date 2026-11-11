import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { config, defaultExportLiteral, isRecord, requireString, requireStrings } from "./config";

/**
 * A design system adapter names the parts of a design system the checks look
 * for: its packages, its action control and which variant is primary, its
 * disclosure, its question part, the status pieces a page shell may hold,
 * and the tokens behind the action control's size. The checks hold no
 * design system names of their own.
 *
 * The module that harness.config.ts names is plain literals, like the config:
 * check:inventories reads it at the pull request base with `git show`. A
 * change to it changes what every check counts, so it needs a proposal.
 * The fixtures run the checks on a config that names a stand-in adapter,
 * which proves that no design system name is left in the checks.
 */

export type DesignSystemAdapter = {
  /** The design system's name, for messages. */
  readonly name: string;
  /** Packages only the catalog may import. A subpath import counts too. */
  readonly packages: readonly string[];
  /** The action control: the part a primary or secondary action is. */
  readonly action: {
    /** JSX tag, as the catalog spells it: `Button.Root`. */
    readonly tag: string;
    /** The prop that picks the variant. */
    readonly variantProp: string;
    /** Variant values that make the action primary. */
    readonly primary: readonly string[];
    /** True when an action with no variant prop is primary. */
    readonly primaryByDefault: boolean;
    /** The variant value of a secondary action. */
    readonly secondary: string;
  };
  readonly disclosure: {
    /** The disclosure element the caps count. */
    readonly root: string;
    /** The part whose text names the disclosed section. */
    readonly summary: string;
  };
  /** Parts that are a question: the form field that wraps an input. */
  readonly questions: readonly string[];
  /** Tag roots a collection's loading, empty and error states may use in the page shell. */
  readonly statusParts: readonly string[];
  /** Tokens that set the action control's height. */
  readonly tokens: {
    /** The design system's stylesheet. */
    readonly css: string;
    readonly actionPaddingY: string;
    readonly actionFontSize: string;
    /** Prefix of private variables, which fall through to their fallback. */
    readonly privatePrefix: string;
  };
};

function requireBoolean(record: Record<string, unknown>, key: string, where: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") throw new Error(`${where}.${key} must be true or false.`);
  return value;
}

function requireRecord(record: Record<string, unknown>, key: string, where: string): Record<string, unknown> {
  const value = record[key];
  if (!isRecord(value)) throw new Error(`${where}.${key} must be an object.`);
  return value;
}

function requireList(record: Record<string, unknown>, key: string, where: string): string[] {
  const value = requireStrings(record, key, where);
  if (value.length === 0) throw new Error(`${where}.${key} must name at least one part.`);
  return value;
}

/** Parses an adapter module's source text. Throws when it is not plain literals or misses a field. */
export function parseAdapter(text: string, label: string): DesignSystemAdapter {
  const value = defaultExportLiteral(text, label, "adapter");
  if (!isRecord(value)) throw new Error(`${label} must export an adapter object.`);
  const action = requireRecord(value, "action", "adapter");
  const disclosure = requireRecord(value, "disclosure", "adapter");
  const tokens = requireRecord(value, "tokens", "adapter");
  const primary = requireStrings(action, "primary", "adapter.action");
  const primaryByDefault = requireBoolean(action, "primaryByDefault", "adapter.action");
  if (primary.length === 0 && !primaryByDefault) throw new Error("adapter.action has no way to be primary.");
  const secondary = requireString(action, "secondary", "adapter.action");
  if (primary.includes(secondary)) throw new Error(`adapter.action.secondary "${secondary}" is also a primary variant.`);
  return {
    name: requireString(value, "name", "adapter"),
    packages: requireList(value, "packages", "adapter"),
    action: {
      tag: requireString(action, "tag", "adapter.action"),
      variantProp: requireString(action, "variantProp", "adapter.action"),
      primary,
      primaryByDefault,
      secondary,
    },
    disclosure: {
      root: requireString(disclosure, "root", "adapter.disclosure"),
      summary: requireString(disclosure, "summary", "adapter.disclosure"),
    },
    questions: requireList(value, "questions", "adapter"),
    statusParts: requireList(value, "statusParts", "adapter"),
    tokens: {
      css: requireString(tokens, "css", "adapter.tokens"),
      actionPaddingY: requireString(tokens, "actionPaddingY", "adapter.tokens"),
      actionFontSize: requireString(tokens, "actionFontSize", "adapter.tokens"),
      privatePrefix: requireString(tokens, "privatePrefix", "adapter.tokens"),
    },
  };
}

function loadAdapter(): DesignSystemAdapter {
  try {
    const file = config.adapter;
    if (!existsSync(path.resolve(file))) throw new Error(`${file} is missing.`);
    return parseAdapter(readFileSync(path.resolve(file), "utf8"), file);
  } catch (error) {
    console.error(`design system adapter: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/** The adapter the config names. */
export const adapter: DesignSystemAdapter = loadAdapter();

/** True when a variant value, as attributeValue reads it, makes the action primary. */
export function isPrimaryVariant(variant: string | null): boolean {
  if (variant === null) return adapter.action.primaryByDefault;
  return adapter.action.primary.includes(variant);
}

/** True when an import specifier is one of the design system's packages or a subpath of one. */
export function isDesignSystemImport(specifier: string): boolean {
  return adapter.packages.some((name) => specifier === name || specifier.startsWith(`${name}/`));
}
