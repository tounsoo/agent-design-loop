import { describe, expect, it } from "vitest";
import type { AxNode } from "./accessible-names";
import { actionsOf, applyKnownGaps, auditPress, keyFor, parseKnownGaps, type FoundProblem, type Press } from "./presses";

const FILE = "flows/accessible-names.ts";

function node(role: string, fields: Partial<AxNode> = {}): AxNode {
  const live = ["status", "alert", "log", "timer", "marquee", "progressbar", "meter"].includes(role);
  return { role, name: "", text: "", current: null, disabled: false, expanded: null, checked: null, pressed: null, selected: null, live, html: `<${role}>`, backendId: null, ...fields };
}

const join = node("button", { name: "Join waitlist for Cedar", backendId: 10 });
const emptyStatus = node("status", { backendId: 20 });
const heading = node("heading", { name: "Waitlist", backendId: 30 });

function press(after: AxNode[], fields: Partial<Press> = {}): Press {
  return { action: join, before: [heading, emptyStatus, join], after, focus: { backendId: 10, onBody: false }, inDocument: true, ...fields };
}

describe("actionsOf", () => {
  it("keeps the enabled controls a person presses, and leaves out fields and turned-off buttons", () => {
    const tree = [heading, join, node("button", { name: "Book", disabled: true, backendId: 11 }), node("combobox", { name: "How long?", backendId: 12 }), node("DisclosureTriangle", { name: "Details", backendId: 13 })];
    expect(actionsOf(tree).map((action) => action.name)).toEqual(["Join waitlist for Cedar", "Details"]);
  });

  it("presses a checkbox with Space and a button with Enter", () => {
    expect(keyFor(node("checkbox"))).toBe("Space");
    expect(keyFor(join)).toBe("Enter");
  });
});

describe("auditPress", () => {
  const leave = node("button", { name: "Leave waitlist for Cedar", backendId: 10 });

  it("passes a press that changes nothing a screen reader reads", () => {
    expect(auditPress(press([heading, emptyStatus, join]))).toBeNull();
  });

  it("passes a press whose status region, on the page before it, says something new", () => {
    expect(auditPress(press([heading, node("status", { text: "You're on the waitlist for Cedar.", backendId: 20 }), leave]))).toBeNull();
  });

  it("fails a press that only renames the focused button, which a screen reader does not read out", () => {
    const problem = auditPress(press([heading, emptyStatus, leave]));
    expect(problem?.kind).toBe("silent");
    expect(problem?.message).toBe(
      'pressing button "Join waitlist for Cedar" changes the page, and a screen reader hears nothing: no live region says anything new, focus stays where it was, and the control\'s own state does not change. It now has button "Leave waitlist for Cedar". Say it in a status region that is on the page before the press, or move focus to what changed.',
    );
  });

  it("does not count a status region added with its words in it, but counts an alert", () => {
    const before = [heading, join];
    expect(auditPress(press([heading, node("status", { text: "Joined", backendId: 21 }), leave], { before }))?.kind).toBe("silent");
    expect(auditPress(press([heading, node("alert", { text: "Joined", backendId: 21 }), leave], { before }))).toBeNull();
  });

  it("does not count a progress bar as news", () => {
    expect(auditPress(press([heading, emptyStatus, node("progressbar", { name: "Loading", backendId: 40 }), join]))?.kind).toBe("silent");
  });

  it("passes a press that moves focus to another element", () => {
    expect(auditPress(press([heading, emptyStatus, leave, node("textbox", { name: "Reason", backendId: 50 })], { focus: { backendId: 50, onBody: false } }))).toBeNull();
  });

  it("passes a press that changes the focused control's own state, which a screen reader reads out", () => {
    const summary = node("DisclosureTriangle", { name: "Room details", expanded: false, backendId: 10 });
    const opened = { ...summary, expanded: true };
    expect(auditPress({ action: summary, before: [summary], after: [opened, node("paragraph", { text: "Whiteboard" })], focus: { backendId: 10, onBody: false }, inDocument: true })).toBeNull();
  });

  it("fails focus that falls to the page body, even when the status region spoke, and says why the element lost it", () => {
    const spoke = node("status", { text: "You're on the waitlist for Cedar.", backendId: 20 });
    const removed = auditPress(press([heading, spoke, node("button", { name: "Leave waitlist for Cedar", backendId: 11 })], { focus: { backendId: null, onBody: true }, inDocument: false }));
    expect(removed).toEqual({
      kind: "focus lost",
      press: 'button "Join waitlist for Cedar"',
      message: 'pressing button "Join waitlist for Cedar" removes it from the page, and focus falls to the page body, so a screen reader starts again from the top. Keep focus on the same element, or move it to what replaced it.',
    });
    const off = auditPress(press([heading, emptyStatus, { ...join, disabled: true }], { focus: { backendId: null, onBody: true } }));
    expect(off?.message).toContain("turns it off, and focus falls to the page body, so a screen reader starts again from the top. Nothing on the page says what changed either.");
  });

  it("fails focus that falls to the page body when nothing else a screen reader reads changed", () => {
    const blurred = auditPress(press([heading, emptyStatus, join], { focus: { backendId: null, onBody: true } }));
    expect(blurred?.kind).toBe("focus lost");
    expect(blurred?.message).toBe(
      'pressing button "Join waitlist for Cedar" leaves it on the page, and focus falls to the page body, so a screen reader starts again from the top. Keep focus on the same element, or move it to what replaced it.',
    );
  });
});

describe("parseKnownGaps", () => {
  const previews = ["state=waitlist", "state=freed"];

  it("reads no export as no gaps", () => {
    expect(parseKnownGaps(undefined, FILE, previews)).toEqual({ gaps: [], problems: [] });
  });

  it("accepts a gap with presses, a problem, a reason and optional previews", () => {
    const value = [{ presses: ['button "Try again"'], problem: "focus lost", previews: ["state=freed"], why: "Waits for the loading status." }];
    expect(parseKnownGaps(value, FILE, previews)).toEqual({ gaps: value, problems: [] });
  });

  it("fails a gap with no reason, an unknown problem or key, or a preview the flow does not open", () => {
    const { problems } = parseKnownGaps(
      [
        { presses: ['button "A"'], problem: "silent" },
        { presses: ['button "A"'], problem: "quiet", why: "x" },
        { presses: ['button "A"'], problem: "silent", why: "x", when: "now" },
        { presses: [], problem: "silent", why: "x" },
        { presses: ['button "A"'], problem: "silent", why: "x", previews: ["state=done"] },
      ],
      FILE,
      previews,
    );
    expect(problems).toEqual([
      `${FILE} knownGaps[0] needs why: what fixes it, and why it waits.`,
      `${FILE} knownGaps[1] needs problem: "focus lost" or "silent".`,
      `${FILE} knownGaps[2] has unknown keys: when. It reads presses, problem, previews, why.`,
      `${FILE} knownGaps[3] needs presses: each press as a failure names it, such as 'button "Try again"'.`,
      `${FILE} knownGaps[4] names "state=done", which is not a preview of this flow.`,
    ]);
  });
});

describe("applyKnownGaps", () => {
  const found = (preview: string, press: string, kind: FoundProblem["kind"] = "silent"): FoundProblem => ({ kind, press, preview, message: `${press} on ${preview}` });

  it("lists a problem a gap names, on any preview when the gap names none", () => {
    const problems = [found("state=waitlist", 'button "A"'), found("state=freed", 'button "A"'), found("state=freed", 'button "B"')];
    const result = applyKnownGaps(problems, [{ presses: ['button "A"'], problem: "silent", why: "x" }], FILE);
    expect(result.listed).toHaveLength(2);
    expect(result.unlisted.map((problem) => problem.press)).toEqual(['button "B"']);
    expect(result.stale).toEqual([]);
  });

  it("does not list a problem of another kind or on a preview the gap leaves out", () => {
    const problems = [found("state=waitlist", 'button "A"', "focus lost"), found("state=freed", 'button "A"')];
    const result = applyKnownGaps(problems, [{ presses: ['button "A"'], problem: "silent", previews: ["state=waitlist"], why: "x" }], FILE);
    expect(result.listed).toEqual([]);
    expect(result.stale).toEqual([`${FILE} knownGaps lists button "A" as "silent", and pressing it on ?state=waitlist no longer has that problem. Take it off the list.`]);
  });

  it("fails a gap whose press no longer has its problem anywhere", () => {
    expect(applyKnownGaps([], [{ presses: ['button "A"'], problem: "focus lost", why: "x" }], FILE).stale).toEqual([
      `${FILE} knownGaps lists button "A" as "focus lost", and pressing it on any preview no longer has that problem. Take it off the list.`,
    ]);
  });
});
