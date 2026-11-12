import type { DesignSystemAdapter } from "./adapter";
import type { HarnessConfig, ParsedConfig, ShellRules } from "./parse-config";

/**
 * What check:inventories compares between a pull request's base and its
 * head, item by item, and how each difference may be covered. It lives
 * apart from the check, which runs as a script on import, so the comparison
 * can be tested on its own.
 *
 * Proposal 2026-11-12-right-size-governance sorts every difference by what
 * it does to the rules:
 *
 * - An addition grows what a product has: a member of one of the four lists
 *   (catalog exports, `allowed_layouts`, `allowed_content_layouts` and flow
 *   states), a new page type with its own new `shells` entry, a new task with
 *   its graph module, or a new preview pair. A proposal this change adds may
 *   cover it under `adds`: the bare member for the four lists, and
 *   `page-type:<id>`, `task:<id>` or `preview:<state>?<query>` for the rest.
 * - A tightening makes a rule input stricter: a task's `max_steps` lowered, a
 *   cap lowered, `TARGET_MIN_PX` raised, a section added to
 *   `disclosed_sections`. A proposal this change adds may cover it under
 *   `tightens`, unless the same change also moves any of those inputs the
 *   other way.
 * - Anything else, removals and renames included, waits for a proposal
 *   decided on the base that lists the change's terms under `changes`.
 */

export type StepBudget = { readonly id: string; readonly success_state: string; readonly max_steps: number };
export type PriorityItem = { readonly action: string; readonly rank: number; readonly level: string };

export type Inventory = {
  readonly layouts: readonly string[] | null;
  readonly contentLayouts: readonly string[] | null;
  readonly pageTypes: readonly string[];
  readonly catalogExports: readonly string[];
  readonly flowStates: readonly string[];
  readonly tasks: readonly StepBudget[];
  readonly priority: readonly PriorityItem[];
  readonly disclosedSections: readonly string[] | null;
  readonly disclosureDepth: number;
  readonly disclosuresPerPage: number;
  readonly visibleQuestions: number;
  readonly targetMinPx: number;
  /**
   * Each modeled state's preview queries, as the flows in use name them: an
   * empty list for a state opened once, bare. A state in two flows has the
   * queries of both.
   */
  readonly previews: Readonly<Record<string, readonly string[]>>;
  /** The root's own harness config, or null when the root has none. */
  readonly config: ParsedConfig | null;
  /** The adapter the root's config names, or null when it names none. */
  readonly adapter: DesignSystemAdapter | null;
};

/**
 * The terms a decided proposal must list under `changes` to cover a change:
 * a member, the task or action whose rule input changed, the cap or config
 * field. A term that lists alternatives is named when any one of them is.
 */
export type Term = string | readonly string[];

/** A tightenable input this change moved the other way, by the name a proposal would list under `tightens`. */
export type Loosening = { readonly name: string; readonly how: string };

export type Change = {
  readonly text: string;
  /** What a decided proposal lists under `changes` to cover it. */
  readonly terms: readonly Term[];
  /** Set when a proposal this change adds may cover it, under that field, by naming every one of `names`. */
  readonly kind?: "adds" | "tightens";
  /**
   * The names a proposal this change adds would list for it: under `kind`
   * when it is set, or, when it is not, the names a proposal may have listed
   * and that this change does not let it cover.
   */
  readonly names: readonly string[];
  /** Why a change that would have been a tightening is not one. */
  readonly notTightening?: string;
  /** Why a change whose `names` would have been additions is not an addition. */
  readonly notAddition?: string;
  /** Tightenable inputs this change loosens. A proposal that lists one under `tightens` covers nothing. */
  readonly loosens?: readonly Loosening[];
  /** Added bare members that sit on the base in another of the four lists, so a base proposal's `adds` of that name was for that list. */
  readonly elsewhere?: readonly string[];
  readonly note?: string;
};

/** The four lists whose bare member names a proposal lists under `adds`. */
export const ADDABLE_LISTS = ["catalog exports", "allowed_layouts", "allowed_content_layouts", "flow states"] as const;

const sortedUnique = (values: readonly string[]): string[] => [...new Set(values)].sort();

function differingMembers(before: readonly string[], after: readonly string[]): string[] {
  return sortedUnique([...before.filter((item) => !after.includes(item)), ...after.filter((item) => !before.includes(item))]);
}

/** Every string inside a value, keys of records included, as in a flow's module paths and preview queries. */
export function stringLeaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringLeaves);
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, inner]) => [key, ...stringLeaves(inner)]);
  }
  return [];
}

function leafDiff(before: unknown, after: unknown): string[] {
  const left = new Set(stringLeaves(before));
  const right = new Set(stringLeaves(after));
  return sortedUnique([...right].filter((value) => !left.has(value)).concat([...left].filter((value) => !right.has(value))));
}

/** Each page type's own shells entry: which rule it is in and what the entry holds. */
type ShellEntry = { readonly rule: keyof ShellRules; readonly value: string };

function shellEntries(shells: ShellRules | null): Map<string, ShellEntry[]> {
  const entries = new Map<string, ShellEntry[]>();
  for (const rule of ["primarySlots", "collections"] as const) {
    for (const [pageType, value] of Object.entries(shells?.[rule] ?? {})) {
      entries.set(pageType, [...(entries.get(pageType) ?? []), { rule, value: JSON.stringify(value) }]);
    }
  }
  return entries;
}

/** How a new page type's entry reads in a pass line: `board joins shells.collections: chrome Heading, Description`. */
function joins(pageType: string, shells: ShellRules): string {
  const primary = shells.primarySlots[pageType];
  if (primary !== undefined) return `${pageType} joins shells.primarySlots: primary slot ${primary}`;
  const chrome = shells.collections[pageType] ?? [];
  return `${pageType} joins shells.collections: chrome ${chrome.length > 0 ? chrome.join(", ") : "none"}`;
}

/**
 * The new page types whose shells entries let them be additions: each new
 * page type has exactly one new entry, every entry the base had is
 * unchanged, and no other key is new. Null, with the reason, when the shells
 * change is anything more.
 */
function shellAdditions(base: ShellRules | null, head: ShellRules | null, newPageTypes: readonly string[]): { ok: true } | { ok: false; reason: string; changedBase: string[] } {
  if (base === null || head === null) return { ok: false, reason: "the base config has no shells to compare with", changedBase: [] };
  const before = shellEntries(base);
  const after = shellEntries(head);
  const changedBase = [...before.keys()].filter((pageType) => JSON.stringify(before.get(pageType)) !== JSON.stringify(after.get(pageType))).sort();
  if (changedBase.length > 0) {
    return { ok: false, reason: `the change also alters a shells entry the base had (${changedBase.map((name) => `"${name}"`).join(", ")})`, changedBase };
  }
  const added = [...after.keys()].filter((pageType) => !before.has(pageType));
  const stray = added.filter((pageType) => !newPageTypes.includes(pageType));
  if (stray.length > 0) return { ok: false, reason: `shells names ${stray.map((name) => `"${name}"`).join(", ")}, which is not a page type this change adds`, changedBase };
  const missing = newPageTypes.filter((pageType) => (after.get(pageType)?.length ?? 0) !== 1);
  if (missing.length > 0) {
    return { ok: false, reason: `each new page type needs exactly one new entry under shells, and ${missing.map((name) => `"${name}"`).join(", ")} has none or two`, changedBase };
  }
  return { ok: true };
}

/**
 * Each preview a state has, as `state?query`, or `state` for one opened
 * bare. Only states both sides model are compared: a new state's previews
 * come with the flow state it adds, and a removed state's go with it.
 */
function previewPairs(previews: Readonly<Record<string, readonly string[]>>, states: readonly string[]): string[] {
  return states.flatMap((state) => {
    const queries = previews[state] ?? [];
    return queries.length === 0 ? [state] : queries.map((query) => `${state}?${query}`);
  });
}

/** Task id → graph module, across the flows a config names. */
function taskGraphs(config: ParsedConfig): Map<string, string> {
  return new Map(config.flows.flatMap((flow) => Object.entries(flow.tasks ?? {})));
}

/** The flows with their task graphs and previews taken out, which the other comparisons judge item by item. */
function flowsRest(config: ParsedConfig): unknown {
  return config.flows.map((flow) => ({ ...flow, tasks: undefined, previews: undefined }));
}

/**
 * Every membership change from base to head. `compareConfig` is false when
 * the base is another config in the working tree, as the fixtures' is: two
 * configs in one tree differ in their paths by necessity, so the config's
 * paths, flows and shells are not compared then. A new page type still reads
 * both configs' shells to tell whether it brings only its own entry.
 */
export function membershipChanges(base: Inventory, head: Inventory, compareConfig: boolean, configName: string): Change[] {
  const changes: Change[] = [];
  const json = (value: unknown) => JSON.stringify(value);
  const push = (change: Change) => changes.push(change);
  const changedText = (label: string, before: unknown, after: unknown) => `${label} changed from ${json(before)} to ${json(after)}.`;

  // The four lists: an addition when every member the base had is still there.
  const addable = (label: (typeof ADDABLE_LISTS)[number], before: readonly string[], after: readonly string[], others: readonly (readonly string[] | null)[]) => {
    if (json(before) === json(after)) return;
    const terms = differingMembers(before, after);
    if (before.every((member) => after.includes(member))) {
      const added = after.filter((member) => !before.includes(member));
      const elsewhere = added.filter((member) => others.some((list) => list?.includes(member)));
      push({ text: changedText(label, before, after), terms, kind: "adds", names: added, ...(elsewhere.length > 0 ? { elsewhere } : {}) });
    } else push({ text: changedText(label, before, after), terms, names: terms, notAddition: `${label} also loses a member the base had` });
  };
  // A missing list on the base is the bootstrap that records it.
  if (base.layouts !== null) addable("allowed_layouts", base.layouts, head.layouts ?? [], [base.contentLayouts, base.catalogExports, base.flowStates]);
  if (base.contentLayouts !== null) addable("allowed_content_layouts", base.contentLayouts, head.contentLayouts ?? [], [base.layouts, base.catalogExports, base.flowStates]);
  addable("catalog exports", base.catalogExports, head.catalogExports, [base.layouts, base.contentLayouts, base.flowStates]);
  addable("flow states", base.flowStates, head.flowStates, [base.layouts, base.contentLayouts, base.catalogExports]);

  // Page types: an addition when each new one brings its own new shells entry and nothing else in shells changes.
  if (json(base.pageTypes) !== json(head.pageTypes)) {
    const terms = differingMembers(base.pageTypes, head.pageTypes);
    const added = head.pageTypes.filter((member) => !base.pageTypes.includes(member));
    const names = added.map((id) => `page-type:${id}`);
    const text = changedText("allowed_page_types", base.pageTypes, head.pageTypes);
    const removedNone = base.pageTypes.every((member) => head.pageTypes.includes(member));
    const shells = removedNone ? shellAdditions(base.config?.shells ?? null, head.config?.shells ?? null, added) : null;
    if (shells?.ok) push({ text, terms, kind: "adds", names });
    else {
      const reason = shells && !shells.ok ? shells.reason : "allowed_page_types also loses a page type the base had";
      const note = shells && !shells.ok ? ` A new page type is added in one pull request only with its own new entry under shells, and here ${reason}, so it needs a proposal decided on the base that lists the page type and the shells rules it touches under changes.` : "";
      push({ text, terms, names, notAddition: reason, ...(note ? { note } : {}) });
    }
  }

  // Tasks: a new id is an addition; a removed or renamed one is not.
  const baseTasks = new Map(base.tasks.map((task) => [task.id, task]));
  const headTasks = new Map(head.tasks.map((task) => [task.id, task]));
  const addedTasks = [...headTasks.keys()].filter((id) => !baseTasks.has(id)).sort();
  const removedTasks = [...baseTasks.keys()].filter((id) => !headTasks.has(id)).sort();
  if (addedTasks.length > 0 || removedTasks.length > 0) {
    const ids = (tasks: ReadonlyMap<string, StepBudget>) => [...tasks.keys()].sort();
    const text = changedText("tasks", ids(baseTasks), ids(headTasks));
    const names = addedTasks.map((id) => `task:${id}`);
    const terms = ["max_steps", ...addedTasks, ...removedTasks].sort();
    push(removedTasks.length === 0 ? { text, terms, kind: "adds", names } : { text, terms, names, notAddition: `the change also removes or renames ${removedTasks.map((id) => `"${id}"`).join(", ")}` });
  }

  // Tightenable inputs, compared item by item.
  type Tightenable = { readonly text: string; readonly terms: readonly Term[]; readonly name: string; readonly how: string; readonly stricter: boolean };
  const tightenable: Tightenable[] = [];
  const moved = (text: string, terms: readonly Term[], name: string, before: number, after: number, stricter: boolean) =>
    tightenable.push({ text, terms, name, how: `${before} to ${after}`, stricter });
  for (const [id, after] of [...headTasks].sort(([left], [right]) => left.localeCompare(right))) {
    const before = baseTasks.get(id);
    if (!before) continue;
    if (before.success_state !== after.success_state) {
      push({ text: `success_state of "${id}" changed from ${json(before.success_state)} to ${json(after.success_state)}.`, terms: ["success_state", id], names: [] });
    }
    if (before.max_steps !== after.max_steps) {
      // A lower budget for a task whose finish moved is not the same task held tighter.
      const stricter = after.max_steps < before.max_steps && before.success_state === after.success_state;
      moved(`max_steps of "${id}" changed from ${before.max_steps} to ${after.max_steps}.`, ["max_steps", id], `max_steps:${id}`, before.max_steps, after.max_steps, stricter);
    }
  }
  const cap = (name: string, before: number, after: number, stricter: boolean) => {
    if (before !== after) moved(`${name} changed from ${before} to ${after}.`, [name], name, before, after, stricter);
  };
  cap("MAX_DISCLOSURE_DEPTH", base.disclosureDepth, head.disclosureDepth, head.disclosureDepth < base.disclosureDepth);
  cap("MAX_DISCLOSURES_PER_PAGE", base.disclosuresPerPage, head.disclosuresPerPage, head.disclosuresPerPage < base.disclosuresPerPage);
  cap("MAX_VISIBLE_QUESTIONS", base.visibleQuestions, head.visibleQuestions, head.visibleQuestions < base.visibleQuestions);
  cap("TARGET_MIN_PX", base.targetMinPx, head.targetMinPx, head.targetMinPx > base.targetMinPx);
  const sectionChange =
    base.disclosedSections !== null && json(base.disclosedSections) !== json(head.disclosedSections ?? [])
      ? { before: base.disclosedSections, after: head.disclosedSections ?? [] }
      : null;
  const loosened: Loosening[] = tightenable.filter((item) => !item.stricter).map((item) => ({ name: item.name, how: item.how }));
  if (sectionChange) {
    const removed = sectionChange.before.filter((section) => !sectionChange.after.includes(section));
    for (const section of removed) loosened.push({ name: `disclosed_sections:${section}`, how: "removed" });
  }
  const mixed =
    loosened.length > 0
      ? `this change also loosens ${loosened.map((item) => `${item.name} (${item.how})`).join(", ")}, so none of its rule inputs is a tightening`
      : undefined;
  for (const item of tightenable) {
    if (item.stricter && !mixed) push({ text: item.text, terms: item.terms, kind: "tightens", names: [item.name] });
    else if (item.stricter) push({ text: item.text, terms: item.terms, names: [item.name], notTightening: mixed });
    else push({ text: item.text, terms: item.terms, names: [], loosens: [{ name: item.name, how: item.how }] });
  }
  if (sectionChange) {
    const { before, after } = sectionChange;
    const text = changedText("disclosed_sections", before, after);
    const terms = differingMembers(before, after);
    const added = after.filter((section) => !before.includes(section));
    const names = added.map((section) => `disclosed_sections:${section}`);
    const own = loosened.filter((item) => item.name.startsWith("disclosed_sections:"));
    if (own.length > 0) push({ text, terms, names, loosens: own });
    else if (mixed) push({ text, terms, names, notTightening: mixed });
    else push({ text, terms, kind: "tightens", names });
  }

  if (json(base.priority) !== json(head.priority)) {
    const keyed = (items: readonly PriorityItem[]) => new Map(items.map((item) => [item.action, json(item)]));
    const left = keyed(base.priority);
    const right = keyed(head.priority);
    const actions = sortedUnique([...left.keys(), ...right.keys()].filter((action) => left.get(action) !== right.get(action)));
    push({ text: changedText("priority", base.priority, head.priority), terms: ["priority", ...actions], names: [] });
  }

  // The base has the product's inputs but no config at this path: a renamed config would otherwise skip every comparison below.
  if (compareConfig && base.config === null && head.config !== null) {
    push({ text: `${configName} is new: the base has no config at that path to compare.`, terms: [configName], names: [] });
  }
  if (compareConfig && base.config !== null) {
    if (head.config === null) push({ text: `${configName} was removed.`, terms: [configName], names: [] });
    else configChanges(base, head, base.config, head.config, configName, push);
  }
  if (base.adapter !== null) {
    if (head.adapter === null) push({ text: "the design system adapter was removed.", terms: ["adapter"], names: [] });
    else {
      for (const key of sortedUnique([...Object.keys(base.adapter), ...Object.keys(head.adapter)])) {
        const before = base.adapter[key as keyof DesignSystemAdapter];
        const after = head.adapter[key as keyof DesignSystemAdapter];
        if (json(before) !== json(after)) push({ text: changedText(`adapter ${key}`, before, after), terms: [`adapter.${key}`], names: [] });
      }
    }
  }
  return changes;
}

function configChanges(base: Inventory, head: Inventory, before: ParsedConfig, after: ParsedConfig, configName: string, push: (change: Change) => void): void {
  const json = (value: unknown) => JSON.stringify(value);
  const changedText = (label: string, left: unknown, right: unknown) => `${label} changed from ${json(left)} to ${json(right)}.`;
  for (const key of sortedUnique([...Object.keys(before.paths), ...Object.keys(after.paths)])) {
    const left = before.paths[key as keyof HarnessConfig["paths"]];
    const right = after.paths[key as keyof HarnessConfig["paths"]];
    if (json(left) === json(right)) continue;
    const values = typeof right === "string" ? [right] : [];
    push({ text: changedText(`${configName} paths.${key}`, left, right), terms: [[`paths.${key}`, ...values]], names: [] });
  }

  // shells, entry by entry: a new page type's own new entry is part of adding it.
  if (json(before.shells) !== json(after.shells)) {
    const newPageTypes = head.pageTypes.filter((pageType) => !base.pageTypes.includes(pageType));
    const fields = (["primarySlots", "collections"] as const).filter((field) => json(before.shells?.[field]) !== json(after.shells?.[field])).map((field) => `shells.${field}`);
    const verdict = shellAdditions(before.shells, after.shells, newPageTypes);
    const added = Object.keys({ ...after.shells?.primarySlots, ...after.shells?.collections }).filter(
      (pageType) => !Object.hasOwn(before.shells?.primarySlots ?? {}, pageType) && !Object.hasOwn(before.shells?.collections ?? {}, pageType),
    );
    if (verdict.ok && after.shells) {
      for (const pageType of added.sort()) {
        const field = Object.hasOwn(after.shells.primarySlots, pageType) ? "shells.primarySlots" : "shells.collections";
        push({
          text: `${configName} shells adds ${pageType}, the page type this change adds: ${joins(pageType, after.shells)}.`,
          terms: [field],
          kind: "adds",
          names: [`page-type:${pageType}`],
        });
      }
    } else {
      const text =
        !verdict.ok && verdict.changedBase.length > 0
          ? `${configName} shells changed an entry the base had (${verdict.changedBase.map((name) => `"${name}"`).join(", ")}).`
          : changedText(`${configName} shells`, before.shells, after.shells);
      push({ text, terms: fields, names: added.map((pageType) => `page-type:${pageType}`), notAddition: verdict.ok ? "the config has no shells" : verdict.reason });
    }
  }

  // flows: task graphs per task, previews per (state, query) pair, and the rest whole.
  const baseGraphs = taskGraphs(before);
  const headGraphs = taskGraphs(after);
  const newTasks = new Set(head.tasks.map((task) => task.id).filter((id) => !base.tasks.some((task) => task.id === id)));
  for (const id of sortedUnique([...baseGraphs.keys(), ...headGraphs.keys()])) {
    const left = baseGraphs.get(id);
    const right = headGraphs.get(id);
    if (left === right) continue;
    const text = `${configName} flows task graph of "${id}" changed from ${json(left ?? null)} to ${json(right ?? null)}.`;
    const terms = ["flows", ...leafDiff({ [id]: left }, { [id]: right })];
    if (left === undefined && newTasks.has(id)) push({ text, terms, kind: "adds", names: [`task:${id}`] });
    else push({ text, terms, names: [`task:${id}`], notAddition: left === undefined ? `"${id}" is not a task this change adds` : `the graph module of "${id}", a task the base had, ${right === undefined ? "is gone" : "moved"}` });
  }
  const common = base.flowStates.filter((state) => head.flowStates.includes(state));
  const beforePairs = previewPairs(base.previews, common);
  const afterPairs = previewPairs(head.previews, common);
  if (json([...beforePairs].sort()) !== json([...afterPairs].sort())) {
    const text = changedText(`${configName} flows previews`, beforePairs, afterPairs);
    const differing = differingMembers(beforePairs, afterPairs).map((pair) => `preview:${pair}`);
    const added = afterPairs.filter((pair) => !beforePairs.includes(pair)).map((pair) => `preview:${pair}`);
    const kept = beforePairs.every((pair) => afterPairs.includes(pair));
    push(kept ? { text, terms: ["flows", ...differing], kind: "adds", names: added } : { text, terms: ["flows", ...differing], names: added, notAddition: "the change also drops a preview the base had" });
  }
  const restBefore = flowsRest(before);
  const restAfter = flowsRest(after);
  if (json(restBefore) !== json(restAfter)) {
    push({ text: changedText(`${configName} flows`, restBefore, restAfter), terms: ["flows", ...leafDiff(restBefore, restAfter)], names: [] });
  }

  if (before.adapter !== null && before.adapter !== after.adapter) {
    push({ text: changedText(`${configName} adapter`, before.adapter, after.adapter), terms: [after.adapter ?? "adapter"], names: [] });
  }
}
