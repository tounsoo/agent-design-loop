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

/**
 * A shell, with the slots its module gives it: the properties of
 * `Object.assign(Root, { Heading, Body })`. Null when the module defines the
 * shell another way, which fails any shells rule that names its slots.
 */
export type Shell = { readonly pageType: string; readonly name: string; readonly slots: ReadonlySet<string> | null };

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

function resolveRelative(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  for (const candidate of [`${base}.tsx`, `${base}.ts`, path.join(base, "index.tsx"), path.join(base, "index.ts")]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function propertyNames(object: ts.ObjectLiteralExpression): string[] | null {
  const names: string[] = [];
  for (const property of object.properties) {
    if (ts.isShorthandPropertyAssignment(property)) names.push(property.name.text);
    else if (ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) names.push(property.name.text);
    else return null;
  }
  return names;
}

/** The slots `const name = Object.assign(Root, { ... })` gives the shell, or null. */
function assignedSlots(source: ts.SourceFile, name: string): Set<string> | null {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name) continue;
      const call = declaration.initializer;
      if (!call || !ts.isCallExpression(call) || call.expression.getText(source) !== "Object.assign" || call.arguments.length < 2) return null;
      const slots = new Set<string>();
      for (const argument of call.arguments.slice(1)) {
        const names = ts.isObjectLiteralExpression(argument) ? propertyNames(argument) : null;
        if (!names) return null;
        for (const slot of names) slots.add(slot);
      }
      return slots;
    }
  }
  return null;
}

/**
 * The slots the module that defines `name` gives it, following re-exports
 * from the page type's index.ts. Null when they cannot be read.
 */
function slotsOf(file: string, name: string, depth = 0): Set<string> | null {
  if (depth > 3 || !existsSync(file)) return null;
  const source = parseFile(file);
  for (const statement of source.statements) {
    if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) continue;
    const element = statement.exportClause.elements.find((item) => item.name.text === name);
    if (!element) continue;
    const next = resolveRelative(file, statement.moduleSpecifier.text);
    return next ? slotsOf(next, element.propertyName?.text ?? name, depth + 1) : null;
  }
  return assignedSlots(source, name);
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
    for (const name of names) shells.push({ pageType, name, slots: slotsOf(modulePath, name) });
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
 * Slots a shells rule names that the shell does not have. A misspelled chrome
 * slot would turn the real one into body, and a misspelled primary slot would
 * point the rule at a slot no page fills, so a name must match the shell.
 */
function unknownSlots(rule: keyof ShellRules, shell: Shell, named: readonly string[]): string[] {
  if (shell.slots === null) {
    return [`${configName} shells.${rule} names slots of ${shell.name}, but its module does not define ${shell.name} as Object.assign(Root, { ... }), so its slots cannot be checked.`];
  }
  const slots = shell.slots;
  return named
    .filter((slot) => !slots.has(slot))
    .map((slot) => `${configName} shells.${rule} names slot "${slot}" for page type "${shell.pageType}", but ${shell.name} has no such slot. Its slots are ${[...slots].join(", ")}.`);
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
    if (slot === undefined) return [];
    problems.push(...unknownSlots("primarySlots", shell, [slot]));
    return [{ shell, tag: `${shell.name}.${slot}` }];
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
    if (chrome === undefined) return [];
    problems.push(...unknownSlots("collections", shell, chrome));
    return [{ shell, chrome: new Set(chrome.map((slot) => `${shell.name}.${slot}`)) }];
  });
  return { collections, problems };
}
