import { existsSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { configName, type ShellRules } from "./config";
import { parseFile, walk } from "./jsx";

/**
 * A page type's shell is what its module under the page-types path exports:
 * `DetailPage` for Meridian's detail, `BookingPage` for Nook's booking. The
 * checks find shells by those exports and read what each shell's slots mean
 * from the config's `shells` rules, so no shell or slot name lives in a check.
 */

export type Shell = { readonly pageType: string; readonly name: string };

/** A shell whose page holds its one primary action in a named slot. */
export type PrimarySlot = { readonly shell: Shell; readonly tag: string };

/** A collection shell, with its chrome slots as tags. Its other slots are body. */
export type CollectionShell = { readonly shell: Shell; readonly chrome: ReadonlySet<string> };

/** Names a module exports as values, including re-exports. */
export function valueExports(file: string): string[] {
  const source = parseFile(file);
  const names: string[] = [];
  walk(source, (node) => {
    if (!ts.isExportDeclaration(node) || node.isTypeOnly || !node.exportClause || !ts.isNamedExports(node.exportClause)) return;
    for (const element of node.exportClause.elements) {
      if (!element.isTypeOnly) names.push(element.name.text);
    }
  });
  return names;
}

/** The shells of the given page types, from each type's index.ts under pageTypesDir. Problems are for the caller to report. */
export function shellsOf(pageTypes: readonly string[], pageTypesDir: string): { shells: Shell[]; problems: string[] } {
  const shells: Shell[] = [];
  const problems: string[] = [];
  for (const pageType of pageTypes) {
    const modulePath = path.join(pageTypesDir, pageType, "index.ts");
    if (!existsSync(modulePath)) {
      problems.push(`page type "${pageType}" has no shell module.`);
      continue;
    }
    const names = valueExports(modulePath);
    if (names.length === 0) {
      problems.push(`page type "${pageType}" does not export a shell.`);
      continue;
    }
    for (const name of names) shells.push({ pageType, name });
  }
  return { shells, problems };
}

/** Problems with a shells rule that names a page type the product does not allow. */
function unknownPageTypes(rule: keyof ShellRules, named: readonly string[], allowed: readonly string[]): string[] {
  return named
    .filter((pageType) => !allowed.includes(pageType))
    .map((pageType) => `${configName} shells.${rule} names page type "${pageType}", which is not in allowed_page_types.`);
}

/**
 * Every allowed page type is either a primary-slot page or a collection, never
 * both and never neither. A page type in neither would be read by no shell rule,
 * so leaving it out of the config would switch its rules off.
 */
function unclassifiedPageTypes(rules: ShellRules, allowed: readonly string[]): string[] {
  return allowed.flatMap((pageType) => {
    const primary = Object.hasOwn(rules.primarySlots, pageType);
    const collection = Object.hasOwn(rules.collections, pageType);
    if (primary && collection) {
      return [`${configName} shells names page type "${pageType}" in both primarySlots and collections, but a collection has no primary action.`];
    }
    if (!primary && !collection) {
      return [`${configName} shells names page type "${pageType}" in neither primarySlots nor collections, so no shell rule reads its pages.`];
    }
    return [];
  });
}

/** The primary slot of every shell whose page type has one in the config. */
export function primarySlotsOf(
  rules: ShellRules,
  shells: readonly Shell[],
  allowed: readonly string[],
): { slots: PrimarySlot[]; problems: string[] } {
  const named = Object.keys(rules.primarySlots);
  const problems = [...unknownPageTypes("primarySlots", named, allowed), ...unclassifiedPageTypes(rules, allowed)];
  if (named.length === 0) problems.push(`${configName} shells.primarySlots names no page type, so no primary slot is checked.`);
  const slots = shells.flatMap((shell) => {
    const slot = rules.primarySlots[shell.pageType];
    return slot === undefined ? [] : [{ shell, tag: `${shell.name}.${slot}` }];
  });
  return { slots, problems };
}

/** Every shell whose page type the config names as a collection, with its chrome slots. */
export function collectionShellsOf(
  rules: ShellRules,
  shells: readonly Shell[],
  allowed: readonly string[],
): { collections: CollectionShell[]; problems: string[] } {
  const problems = [...unknownPageTypes("collections", Object.keys(rules.collections), allowed), ...unclassifiedPageTypes(rules, allowed)];
  const collections = shells.flatMap((shell) => {
    const chrome = rules.collections[shell.pageType];
    return chrome === undefined ? [] : [{ shell, chrome: new Set(chrome.map((slot) => `${shell.name}.${slot}`)) }];
  });
  return { collections, problems };
}
