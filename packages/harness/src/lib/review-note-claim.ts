/**
 * A review note restates what a check decided. The sentences below are the
 * ones that were false. Each rule reads a string in the check it describes,
 * and fails closed when that string is gone, so a move cannot switch it off.
 */

const HELD_LENGTH = /length it was held for|takes the held length|keep the held length|the held length/i;
const ADAPTER = 'introduced.push("design system adapter")';
const KEEPS_BASE = "before.every((member) => after.includes(member))";
const MEASURES = "measureRoutes";
const NOT_OPEN = 'before.status !== "open"';
const STATUS_LIST = "export const STATUSES";
const ALREADY = "is new and already";

export type Source = { readonly file: string; readonly text: string };

export function reviewNoteProblems(input: {
  notes: ReadonlyMap<string, string>;
  bookingTransition: Source;
  stepBudget: Source;
  proposals: Source;
  inventories: Source;
  membership: Source;
}): string[] {
  const missing: string[] = [];
  const held = heldAnchors(input.bookingTransition, missing);
  const routes = has(input.stepBudget, MEASURES, missing);
  const pinning = proposalAnchors(input.proposals, missing);
  const adapter = has(input.inventories, ADAPTER, missing);
  const addition = hasEither(input.membership, input.inventories, KEEPS_BASE, missing);
  const claims: string[] = [];
  for (const file of [...input.notes.keys()].sort()) {
    const text = input.notes.get(file) ?? "";
    if (held) claims.push(...heldLength(file, text));
    if (routes) claims.push(...stepBudget(file, text));
    if (pinning) claims.push(...proposalPinning(file, text, pinning));
    if (adapter) claims.push(...introducedLists(file, text));
    if (addition) claims.push(...additions(file, text));
  }
  return [...missing, ...claims];
}

function has(source: Source, needle: string, missing: string[]): boolean {
  if (source.text.includes(needle)) return true;
  missing.push(`review-note: ${needle} not found in ${source.file}; update this check`);
  return false;
}

function hasEither(primary: Source, also: Source, needle: string, missing: string[]): boolean {
  if (primary.text.includes(needle) || also.text.includes(needle)) return true;
  missing.push(`review-note: ${needle} not found in ${primary.file}; update this check`);
  return false;
}

function heldAnchors(source: Source, missing: string[]): boolean {
  const book = /case "book"[\s\S]*?duration: state\.duration/.test(source.text);
  const choosing = /case "set-duration"[\s\S]*?status === "choosing"/.test(source.text);
  if (!book) missing.push(`review-note: case "book" duration: state.duration not found in ${source.file}; update this check`);
  if (!choosing) missing.push(`review-note: case "set-duration" status === "choosing" not found in ${source.file}; update this check`);
  return book && choosing;
}

function proposalAnchors(source: Source, missing: string[]): { pinned: string[]; fresh: string } | null {
  const pinnedOpen = has(source, NOT_OPEN, missing);
  const listed = /export const STATUSES = \[([^\]]+)\]/.exec(source.text)?.[1];
  if (listed === undefined) missing.push(`review-note: ${STATUS_LIST} not found in ${source.file}; update this check`);
  const fresh = /is new and already (graduated|adopted)/.exec(source.text)?.[1];
  if (fresh === undefined) missing.push(`review-note: ${ALREADY} not found in ${source.file}; update this check`);
  if (!pinnedOpen || listed === undefined || fresh === undefined) return null;
  const pinned = [...listed.matchAll(/"([a-z]+)"/g)].map((match) => match[1] ?? "").filter((status) => status !== "" && status !== "open");
  return { pinned, fresh };
}

function heldLength(file: string, text: string): string[] {
  if (!file.startsWith("products/nook/review/") || !HELD_LENGTH.test(text)) return [];
  return [
    `${file} says a booking takes the held length. transition in products/nook/flows/booking/transition.ts copies state.duration, and set-duration applies only while choosing, so the booking takes the length chosen before the hold. Say that.`,
  ];
}

function stepBudget(file: string, text: string): string[] {
  const problems: string[] = [];
  for (const bullet of bullets(text)) {
    if (!bullet.includes("check:step-budget")) continue;
    const oneRoute = /one more way|the new route/.test(bullet) && /measures/.test(bullet) && !/every route/.test(bullet);
    const shortestOnly = /shortest/.test(bullet);
    if (!oneRoute && !shortestOnly) continue;
    problems.push(
      `${file} says check:step-budget measures one route. It measures every route that finishes a task, not only the shortest: measureRoutes in packages/harness/src/check-step-budget.ts reads the longer route too. Say every route.`,
    );
  }
  return problems;
}

function proposalPinning(file: string, text: string, pinning: { pinned: string[]; fresh: string }): string[] {
  const problems: string[] = [];
  for (const bullet of bullets(text)) {
    if (!bullet.includes("check:proposals")) continue;
    const clause = /a ([a-z]+)(?: or ([a-z]+))? proposal whose lists change/.exec(bullet);
    if (!clause) continue;
    const named = [clause[1], clause[2]].filter((status): status is string => status !== undefined);
    const absent = pinning.pinned.filter((status) => !named.includes(status));
    if (absent.length > 0) {
      problems.push(
        `${file} says ${series(named)} proposal whose lists change. check:proposals pins those lists once a proposal is not open, so ${series(absent)} proposal's lists cannot change either. Name each of ${pinning.pinned.join(" and ")}.`,
      );
    }
    if (!new RegExp(`new proposal that starts ${pinning.fresh}|already ${pinning.fresh}`).test(bullet)) {
      problems.push(
        `${file} does not say a new proposal that starts ${pinning.fresh} with anything under changes, retires or opts-out fails. check:proposals refuses a proposal that is new and already ${pinning.fresh} when it lists those.`,
      );
    }
  }
  return problems;
}

function introducedLists(file: string, text: string): string[] {
  const problems: string[] = [];
  for (const bullet of bullets(text)) {
    if (!/Every other inventory/.test(bullet) || !/cannot change that way/.test(bullet) || /adapter/.test(bullet)) continue;
    problems.push(
      `${file} says every other inventory cannot be introduced the way a missing list can. introducedLists in packages/harness/src/check-inventories.ts also records the design system adapter when the base names none. Say that.`,
    );
  }
  return problems;
}

function additions(file: string, text: string): string[] {
  const problems: string[] = [];
  for (const bullet of bullets(text)) {
    if (/passes when/.test(bullet) && /lists the id under/.test(bullet) && !/every/.test(bullet)) {
      problems.push(
        `${file} says an addition passes when the proposal lists the id under adds. An addition keeps every member the base had, and lists every new member under adds. A removal or a rename is not an addition.`,
      );
    }
    if (/renaming/.test(bullet) && /lists that id/.test(bullet) && !/both/.test(bullet)) {
      problems.push(`${file} says a rename lists that id under changes. A rename removes one id and adds another, so the proposal lists both.`);
    }
  }
  return problems;
}

function bullets(text: string): string[] {
  return text.split("\n").filter((line) => line.trimStart().startsWith("- "));
}

function series(words: readonly string[]): string {
  return words.map((word) => `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`).join(" or ");
}
