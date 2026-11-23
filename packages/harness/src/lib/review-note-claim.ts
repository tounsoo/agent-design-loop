/**
 * A review note restates what a check decided. When that restatement
 * contradicts the check, the note is the claim the next run copies. Generating
 * the note from the checks would delete the record the review is, so the check
 * compares the sentences that were false with the code they describe, and
 * names what the code does.
 */

const HELD_LENGTH = /length it was held for|takes the held length|keep the held length|the held length/i;

export function reviewNoteProblems(input: {
  notes: ReadonlyMap<string, string>;
  bookingTransition: string;
  stepBudget: string;
  proposals: string;
  inventories: string;
}): string[] {
  const problems: string[] = [];
  for (const file of [...input.notes.keys()].sort()) {
    const text = input.notes.get(file) ?? "";
    problems.push(...heldLength(file, text, input.bookingTransition));
    problems.push(...stepBudget(file, text, input.stepBudget));
    problems.push(...proposalPinning(file, text, input.proposals));
    problems.push(...introducedLists(file, text, input.inventories));
    problems.push(...additions(file, text, input.inventories));
  }
  return problems;
}

function heldLength(file: string, text: string, transition: string): string[] {
  if (!file.startsWith("products/nook/review/")) return [];
  const copiesDuration = /case "book"[\s\S]*?duration: state\.duration/.test(transition);
  const durationWhileChoosing = /case "set-duration"[\s\S]*?status === "choosing"/.test(transition);
  if (!copiesDuration || !durationWhileChoosing || !HELD_LENGTH.test(text)) return [];
  return [
    `${file} says a booking takes the held length. transition in products/nook/flows/booking/transition.ts copies state.duration, and set-duration applies only while choosing, so the booking takes the length chosen before the hold. Say that.`,
  ];
}

function stepBudget(file: string, text: string, source: string): string[] {
  if (!source.includes("measureRoutes")) return [];
  const problems: string[] = [];
  for (const bullet of bullets(text)) {
    if (!bullet.includes("`check:step-budget`") && !bullet.includes("check:step-budget")) continue;
    const oneRoute = /one more way|the new route/.test(bullet) && /measures/.test(bullet) && !/every route/.test(bullet);
    const shortestOnly = /shortest/.test(bullet) || /does not see|doesn't see/.test(bullet);
    if (!oneRoute && !shortestOnly) continue;
    problems.push(
      `${file} says check:step-budget measures one route. It measures every route that finishes a task, not only the shortest: measureRoutes in packages/harness/src/check-step-budget.ts reads the longer route too. Say every route.`,
    );
  }
  return problems;
}

function proposalPinning(file: string, text: string, source: string): string[] {
  if (!/before\.status !== "open"/.test(source)) return [];
  const pinned = statuses(source).filter((status) => status !== "open");
  const fresh = /is new and already (graduated|adopted)/.exec(source)?.[1] ?? "";
  const problems: string[] = [];
  for (const bullet of bullets(text)) {
    if (!bullet.includes("check:proposals")) continue;
    const clause = /a ([a-z]+)(?: or ([a-z]+))? proposal whose lists change/.exec(bullet);
    const named = [clause?.[1], clause?.[2]].filter((status): status is string => status !== undefined);
    const missing = pinned.filter((status) => !named.includes(status));
    if (clause && missing.length > 0) {
      problems.push(
        `${file} says a ${named.join(" or ")} proposal whose lists change. check:proposals pins those lists once a proposal is not open, so a ${missing.join(" or ")} proposal's lists cannot change either. Name each of ${pinned.join(" and ")}.`,
      );
    }
    if (fresh !== "" && !new RegExp(`new proposal that starts ${fresh}|already ${fresh}`).test(bullet)) {
      problems.push(
        `${file} does not say a new proposal that starts ${fresh} with anything under changes, retires or opts-out fails. check:proposals refuses a proposal that is new and already ${fresh} when it lists those.`,
      );
    }
  }
  return problems;
}

function introducedLists(file: string, text: string, source: string): string[] {
  if (!source.includes('introduced.push("design system adapter")')) return [];
  const problems: string[] = [];
  for (const bullet of bullets(text)) {
    if (!/Every other inventory/.test(bullet) || !/cannot change that way/.test(bullet)) continue;
    if (/adapter/.test(bullet)) continue;
    problems.push(
      `${file} says every other inventory cannot be introduced the way a missing list can. introducedLists in packages/harness/src/check-inventories.ts also records the design system adapter when the base names none. Say that.`,
    );
  }
  return problems;
}

function additions(file: string, text: string, source: string): string[] {
  const keepsBase = /before\.every\(\(member\) => after\.includes\(member\)\)/.test(source) || /removes or renames/.test(source) || /not an addition/.test(source);
  if (!keepsBase) return [];
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

function statuses(source: string): string[] {
  const listed = /export const STATUSES = \[([^\]]+)\]/.exec(source)?.[1] ?? "";
  return [...listed.matchAll(/"([a-z]+)"/g)].map((match) => match[1] ?? "").filter((status) => status !== "");
}
