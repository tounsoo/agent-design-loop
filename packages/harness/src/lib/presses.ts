import { statSync } from "node:fs";
import type { AxNode } from "./accessible-names";

/**
 * What check:accessible-names holds each press to. On every scenario it
 * presses each action a keyboard reaches, one at a time from a fresh load of
 * the scenario, and reads the accessibility tree before and after. A press
 * that changes what a screen reader could read must say so: a live region's
 * text changes, focus moves to another element, or the pressed control's own
 * state (expanded, checked, pressed, selected) changes while focus stays on
 * it. And focus never falls to the page body, which sends a screen reader
 * back to the top of the page.
 */

/** Roles a person presses. Text fields, selects and sliders take input, not a press, so they are left out. */
const ACTION_ROLES = new Set([
  "button",
  "link",
  "DisclosureTriangle",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "tab",
  "checkbox",
  "radio",
  "switch",
]);

/** Roles a keyboard toggles with Space; the rest it presses with Enter. */
const SPACE_ROLES = new Set(["checkbox", "radio", "switch", "menuitemcheckbox", "menuitemradio"]);

/** Live nodes that say a value, not news, when they change. */
const QUIET_ROLES = new Set(["progressbar", "meter"]);

/** The actions on a scenario, in document order: every enabled control a person presses. */
export function actionsOf(tree: readonly AxNode[]): AxNode[] {
  return tree.filter((node) => ACTION_ROLES.has(node.role) && !node.disabled && node.backendId !== null);
}

/** The key a keyboard user presses on an action. */
export function keyFor(action: AxNode): "Enter" | "Space" {
  return SPACE_ROLES.has(action.role) ? "Space" : "Enter";
}

/** An action as a screen reader names it, for messages: its role and name. */
export function actionName(action: AxNode): string {
  return `${action.role} "${action.name}"`;
}

/** What a screen reader could read of a node, focus aside. Two trees with the same signatures read the same. */
export function signature(node: AxNode): string {
  return JSON.stringify([node.role, node.name, node.text, node.current, node.disabled, node.expanded, node.checked, node.pressed, node.selected]);
}

/** One press, as the check saw it. */
export type Press = {
  /** The action pressed, as the tree had it with focus on it, before the press. */
  readonly action: AxNode;
  /** The tree with focus on the action, before the press. */
  readonly before: readonly AxNode[];
  /** The tree once the page settled after the press. */
  readonly after: readonly AxNode[];
  /** Where focus is after the press: the focused element's backend id, or the page body. */
  readonly focus: { readonly backendId: number | null; readonly onBody: boolean };
  /** Whether the pressed element is still in the document after the press. */
  readonly inDocument: boolean;
};

function speaks(node: AxNode): boolean {
  return node.live && !QUIET_ROLES.has(node.role);
}

function says(node: AxNode): string {
  return node.text !== "" ? node.text : node.name;
}

/** True when a live region already on the page says something new, or an alert appears with something to say. */
function liveRegionSpoke(before: readonly AxNode[], after: readonly AxNode[]): boolean {
  const earlier = new Map(before.filter(speaks).map((node) => [node.backendId, says(node)]));
  return after.some((node) => {
    if (!speaks(node) || says(node) === "") return false;
    const previous = earlier.get(node.backendId);
    // A region added with its words already in it is not reliably read; an alert is, by its role.
    if (previous === undefined) return node.role === "alert";
    return previous !== says(node);
  });
}

/** Roles that hold others, so a line about them repeats their contents. */
const CONTAINER_ROLES = new Set(["RootWebArea", "generic", "none", "main", "navigation", "region", "banner", "contentinfo", "complementary", "group", "list", "table", "rowgroup", "row", "form", "article", "Section"]);

/** A few lines of what the press changed, so a failure shows what a screen reader was not told. */
function changes(before: readonly AxNode[], after: readonly AxNode[]): string {
  const left = new Map<string, number>();
  for (const node of before) left.set(signature(node), (left.get(signature(node)) ?? 0) + 1);
  const added: AxNode[] = [];
  for (const node of after) {
    const count = left.get(signature(node)) ?? 0;
    if (count > 0) left.set(signature(node), count - 1);
    else if (!CONTAINER_ROLES.has(node.role) && (node.name !== "" || node.text !== "")) added.push(node);
  }
  if (added.length === 0) return "";
  const lines = added.slice(0, 3).map((node) => `${node.role} ${node.name !== "" ? `"${node.name}"` : `reading "${node.text}"`}${node.disabled ? " (disabled)" : ""}`);
  return ` It now has ${lines.join(", ")}${added.length > 3 ? `, and ${added.length - 3} more` : ""}.`;
}

/** What went wrong with a press: focus fell to the page body, or the page changed and nothing said so. */
export type PressProblemKind = "focus lost" | "silent";

/** One press's problem, with the action and the message a failure prints. */
export type PressProblem = { readonly kind: PressProblemKind; readonly press: string; readonly message: string };

/**
 * The problem with one press, or null. A press that changes nothing a screen
 * reader could read, and keeps focus off the page body, passes, whatever it
 * does to the look of the page. Focus that falls to the page body fails even
 * when nothing else changed or a live region spoke, since the reader then
 * starts again from the top.
 */
export function auditPress(press: Press): PressProblem | null {
  const { action, before, after, focus } = press;
  const unchanged = before.map(signature).join("\n") === after.map(signature).join("\n");
  if (unchanged && !focus.onBody) return null;
  const name = actionName(action);
  const pressed = after.find((node) => node.backendId === action.backendId);
  const spoke = liveRegionSpoke(before, after);

  // Focus on the body sends the reader back to the top, whether or not anything else changed.
  if (focus.onBody) {
    const what = !press.inDocument ? "removes it from the page" : pressed === undefined ? "hides it" : pressed.disabled ? "turns it off" : "leaves it on the page";
    const silent = spoke || unchanged ? "" : " Nothing on the page says what changed either.";
    return {
      kind: "focus lost",
      press: name,
      message: `pressing ${name} ${what}, and focus falls to the page body, so a screen reader starts again from the top.${silent} Keep focus on the same element, or move it to what replaced it.`,
    };
  }

  const focusMoved = focus.backendId !== null && focus.backendId !== action.backendId;
  const ownStateChanged =
    pressed !== undefined && focus.backendId === action.backendId && (["expanded", "checked", "pressed", "selected"] as const).some((key) => pressed[key] !== action[key]);
  if (focusMoved || ownStateChanged || spoke) return null;
  return {
    kind: "silent",
    press: name,
    message: `pressing ${name} changes the page, and a screen reader hears nothing: no live region says anything new, focus stays where it was, and the control's own state does not change.${changes(before, after)} Say it in a status region that is on the page before the press, or move focus to what changed.`,
  };
}

/**
 * A press problem a product has not fixed yet, listed beside its
 * declarations so the check passes while the fix waits for its own pull
 * request. A listed gap that no longer happens fails the check, so the list
 * only shrinks as the fixes land.
 */
export type KnownGap = {
  /** Each press as a failure names it: its role and its quoted name, such as `button "Try again"`. */
  readonly presses: readonly string[];
  readonly problem: PressProblemKind;
  /** The scenarios it happens on. Leave it out for every scenario where the press has the problem. */
  readonly scenarios?: readonly string[];
  /** Why it waits, and what fixes it. */
  readonly why: string;
  /**
   * Where its fix is tracked, so no gap waits on nothing: a GitHub issue or
   * pull request, as its URL, or a proposal, as its path from the repository
   * root, such as `proposals/2026-11-12-press-every-action.md`.
   */
  readonly fixIn: string;
};

export type KnownGaps = readonly KnownGap[];

const GAP_KEYS = new Set(["presses", "problem", "scenarios", "why", "fixIn"]);

const TRACKER = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/(issues|pull)\/[1-9]\d*$/;
/** A relative path with no `.` or `..` segment, ending `proposals/<name>.md`, never the folder's README. */
const PROPOSAL = /^(?:(?!\.\.?\/)[\w.-]+\/)*proposals\/(?!\.|README\.md$)[\w.-]+\.md$/;

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** Why `fixIn` names no tracked fix, or null when it does: an issue or pull request URL, or a proposal file that exists. */
function untracked(value: unknown, exists: (file: string) => boolean): string | null {
  const how = "a GitHub issue or pull request URL, or the path of a proposal file under proposals/";
  if (typeof value !== "string" || value.trim() === "") return `needs fixIn: where its fix is tracked, as ${how}.`;
  if (TRACKER.test(value)) return null;
  if (PROPOSAL.test(value)) return exists(value) ? null : `fixIn names ${value}, which does not exist.`;
  return `fixIn must be ${how}, not "${value}".`;
}
const KINDS: readonly PressProblemKind[] = ["focus lost", "silent"];

function nonEmptyStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item.trim() !== "");
}

/**
 * Parses a declarations module's optional `knownGaps` export against the
 * scenarios its flow opens. `exists` says whether a proposal path in `fixIn`
 * is a file, read from the repository root.
 */
export function parseKnownGaps(
  value: unknown,
  file: string,
  scenarios: readonly string[],
  exists: (file: string) => boolean = isFile,
): { gaps: KnownGap[]; problems: string[] } {
  if (value === undefined) return { gaps: [], problems: [] };
  if (!Array.isArray(value)) return { gaps: [], problems: [`${file} exports knownGaps as something other than a list.`] };
  const gaps: KnownGap[] = [];
  const problems: string[] = [];
  for (const [index, item] of value.entries()) {
    const where = `${file} knownGaps[${index}]`;
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      problems.push(`${where} must be an object.`);
      continue;
    }
    const record = item as Record<string, unknown>;
    const unknown = Object.keys(record).filter((key) => !GAP_KEYS.has(key));
    const problem =
      unknown.length > 0
        ? `has unknown keys: ${unknown.join(", ")}. It reads ${[...GAP_KEYS].join(", ")}.`
        : !nonEmptyStrings(record.presses)
          ? 'needs presses: each press as a failure names it, such as \'button "Try again"\'.'
          : !KINDS.includes(record.problem as PressProblemKind)
            ? `needs problem: ${KINDS.map((kind) => `"${kind}"`).join(" or ")}.`
            : record.scenarios !== undefined && !nonEmptyStrings(record.scenarios)
              ? "scenarios must list at least one scenario, or be left out for every scenario."
              : typeof record.why !== "string" || record.why.trim() === ""
                ? "needs why: what fixes it, and why it waits."
                : untracked(record.fixIn, exists);
    if (problem !== null) {
      problems.push(`${where} ${problem}`);
      continue;
    }
    const stale = ((record.scenarios as string[] | undefined) ?? []).filter((scenario) => !scenarios.includes(scenario));
    if (stale.length > 0) {
      problems.push(`${where} names ${stale.map((scenario) => `"${scenario}"`).join(", ")}, which is not a scenario of this flow.`);
      continue;
    }
    gaps.push(record as unknown as KnownGap);
  }
  return { gaps, problems };
}

/** A press problem on one scenario. */
export type FoundProblem = PressProblem & { readonly scenario: string };

/**
 * Splits the problems the presses found into those a known gap lists and
 * those it does not, and names each listed press that no longer has its
 * problem, so a fixed gap comes off the list.
 */
export function applyKnownGaps(found: readonly FoundProblem[], gaps: readonly KnownGap[], file: string): { unlisted: FoundProblem[]; listed: FoundProblem[]; stale: string[] } {
  const covers = (gap: KnownGap, problem: FoundProblem) =>
    gap.problem === problem.kind && gap.presses.includes(problem.press) && (gap.scenarios === undefined || gap.scenarios.includes(problem.scenario));
  const unlisted = found.filter((problem) => !gaps.some((gap) => covers(gap, problem)));
  const listed = found.filter((problem) => gaps.some((gap) => covers(gap, problem)));
  const stale: string[] = [];
  for (const gap of gaps) {
    for (const press of gap.presses) {
      const where = gap.scenarios ?? [undefined];
      for (const scenario of where) {
        const happens = found.some((problem) => problem.kind === gap.problem && problem.press === press && (scenario === undefined || problem.scenario === scenario));
        if (!happens) {
          const on = scenario === undefined ? "on any scenario" : `on scenario ${scenario}`;
          stale.push(`${file} knownGaps lists ${press} as "${gap.problem}", and pressing it ${on} no longer has that problem. Take it off the list.`);
        }
      }
    }
  }
  return { unlisted, listed, stale };
}
