import { describe, expect, it } from "vitest";
import { EDGE_STATES, addingInThisChange, adopting, nameProblems, parseAll, sharedNameProblems, parseProposal, transitionProblems, type Proposal } from "./proposals";

const BODY = "# Proposal 0102: Add a side panel\n\n## Reason\n\nA frame beside the page.\n\n## Preview\n\n```\n[page | panel]\n```\n\n## Adoption, after approval\n\n- inputs\n";

function text(front: string, body = BODY): string {
  return `---\n${front}\n---\n${body}`;
}

const LISTED: Proposal["states"] = [{ name: "Pending", text: "The panel shows the record.", outOfScope: false }];

function proposal(file: string, status: Proposal["status"], changes: string[] = [], retires: string[] = [], states: Proposal["states"] = LISTED): Proposal {
  return { file, status, changes, retires, optsOut: [], adds: [], states };
}

describe("parseProposal", () => {
  it("reads status, changes, retires and opts-out", () => {
    const parsed = parseProposal(
      "p.md",
      text("status: decided\nchanges:\n  - side-panel\n  - allowed_layouts\nretires:\n  - check:disclosure\nopts-out:\n  - check:priority for products/nook"),
    );
    expect(parsed.problems).toEqual([]);
    expect(parsed.proposal).toEqual({
      file: "p.md",
      status: "decided",
      changes: ["side-panel", "allowed_layouts"],
      retires: ["check:disclosure"],
      optsOut: [{ rule: "check:priority", source: "products/nook" }],
      adds: [],
      states: null,
    });
  });

  it("takes [] as an empty list and leaves the optional lists empty", () => {
    expect(parseProposal("p.md", text("status: open\nchanges: []")).proposal).toMatchObject({ changes: [], retires: [], optsOut: [] });
  });

  it("fails a file whose words match the old keywords but has no front matter", () => {
    const parsed = parseProposal("p.md", "Status: decided.\n\nThe reason is a preview of the adoption for side-panel.\n");
    expect(parsed.proposal).toBeNull();
    expect(parsed.problems.join("\n")).toContain("has no front matter");
  });

  it("requires status and changes", () => {
    expect(parseProposal("p.md", text("retires: []")).problems).toEqual(['front matter has no "status".', 'front matter has no "changes".']);
  });

  it("fails an unknown status or key", () => {
    const problems = parseProposal("p.md", text("status: approved\nchanges: []\nowner: ben")).problems.join("\n");
    expect(problems).toContain('unknown key "owner"');
    expect(problems).toContain("status must be one of open, decided, adopted");
  });

  it("fails changes written as a sentence instead of a list", () => {
    expect(parseProposal("p.md", text("status: open\nchanges: side-panel")).problems.join("\n")).toContain('"changes" must be a list');
  });

  it("fails a missing or empty section", () => {
    const body = "## Reason\n\n## Preview\n\nA preview.\n";
    const problems = parseProposal("p.md", text("status: open\nchanges: []", body)).problems;
    expect(problems).toEqual(['"## Reason" section is empty.', 'has no "## Adoption" section.']);
  });

  it("does not take a section heading inside a code block", () => {
    const body = "## Reason\n\nWhy.\n\n## Preview\n\n```md\n## Adoption\n\nNothing.\n```\n";
    expect(parseProposal("p.md", text("status: open\nchanges: []", body)).problems).toEqual(['has no "## Adoption" section.']);
  });

  it("fails a quoted value or a comment, which would match nothing", () => {
    const problems = parseProposal("p.md", text('status: decided\nchanges:\n  - "Tooltip"\n  - Card # the card')).problems.join("\n");
    expect(problems).toContain('front matter value "\\"Tooltip\\"" has quotes or a comment');
    expect(problems).toContain('front matter value "Card # the card" has quotes or a comment');
  });

  it("does not take a section heading inside an HTML comment", () => {
    const body = "## Reason\n\nWhy.\n\n<!--\n## Preview\n\nTODO\n\n## Adoption\n\nTODO\n-->\n";
    expect(parseProposal("p.md", text("status: open\nchanges: []", body)).problems).toEqual(['has no "## Preview" section.', 'has no "## Adoption" section.']);
  });

  it("keeps a code block open past a fence line with an info string", () => {
    const body = "## Reason\n\nWhy.\n\n```\nexample\n```md\n## Preview\n\nInside.\n";
    expect(parseProposal("p.md", text("status: open\nchanges: []", body)).problems).toContain('has no "## Preview" section.');
  });

  it("fails an opts-out entry that does not name a rule and a product", () => {
    expect(parseProposal("p.md", text("status: adopted\nchanges: []\nopts-out:\n  - check:priority")).problems.join("\n")).toContain(
      'is not "<rule> for <product paths.source>"',
    );
  });
});

describe("a proposal that only adds", () => {
  it("reads adds on an adopted proposal that lists nothing else", () => {
    const parsed = parseProposal("p.md", text("status: adopted\nchanges: []\nadds:\n  - side-panel"));
    expect(parsed.problems).toEqual([]);
    expect(parsed.proposal).toMatchObject({ status: "adopted", changes: [], adds: ["side-panel"] });
  });

  it("fails adds alongside changes, retires or opts-out, so a mixed proposal cannot skip approval", () => {
    for (const extra of ["changes:\n  - TARGET_MIN_PX", "changes: []\nretires:\n  - check:disclosure", "changes: []\nopts-out:\n  - check:priority for products/nook"]) {
      const parsed = parseProposal("p.md", text(`status: adopted\n${extra}\nadds:\n  - side-panel`));
      expect(parsed.proposal).toBeNull();
      expect(parsed.problems.join("\n")).toContain("lists adds alongside");
    }
  });

  it("fails adds on an open or decided proposal: it is adopted in the pull request that adds it", () => {
    for (const status of ["open", "decided"]) {
      const parsed = parseProposal("p.md", text(`status: ${status}\nchanges: []\nadds:\n  - side-panel`));
      expect(parsed.problems.join("\n")).toContain("lists adds, so its status is adopted");
    }
  });

  it("passes check:proposals as a new adopted proposal, and pins its adds once merged", () => {
    const adding: Proposal = { ...proposal("p.md", "adopted"), adds: ["side-panel"] };
    expect(transitionProblems(new Map(), new Map([["p.md", adding]]))).toEqual([]);
    const widened: Proposal = { ...adding, adds: ["side-panel", "Card"] };
    expect(transitionProblems(new Map([["p.md", adding]]), new Map([["p.md", widened]])).join("\n")).toContain("its adds cannot change");
  });

  it("covers only in the pull request that adds it", () => {
    const adding: Proposal = { ...proposal("p.md", "adopted"), adds: ["side-panel"] };
    const plain = proposal("q.md", "adopted");
    expect(addingInThisChange(new Map(), new Map([["p.md", adding], ["q.md", plain]]))).toEqual([adding]);
    expect(addingInThisChange(new Map([["p.md", adding]]), new Map([["p.md", adding]]))).toEqual([]);
  });
});

describe("adopting", () => {
  it("returns proposals decided on the base and adopted in the head, as the base has them", () => {
    const base = new Map([["a.md", proposal("base/a.md", "decided", ["side-panel"])]]);
    const head = new Map([["a.md", proposal("head/a.md", "adopted", ["side-panel", "toast"])]]);
    expect(adopting(base, head)).toEqual([proposal("head/a.md", "decided", ["side-panel"])]);
  });

  it("does not return a proposal the head adds, an open request, or one still decided", () => {
    const base = new Map([
      ["open.md", proposal("open.md", "open", ["x"])],
      ["still.md", proposal("still.md", "decided", ["y"])],
    ]);
    const head = new Map([
      ["new.md", proposal("new.md", "adopted", ["z"])],
      ["open.md", proposal("open.md", "adopted", ["x"])],
      ["still.md", proposal("still.md", "decided", ["y"])],
    ]);
    expect(adopting(base, head)).toEqual([]);
  });
});

describe("transitionProblems", () => {
  it("allows open → decided and decided → adopted", () => {
    const base = new Map([
      ["a.md", proposal("a.md", "open", ["x"])],
      ["b.md", proposal("b.md", "decided", ["y"])],
    ]);
    const head = new Map([
      ["a.md", proposal("a.md", "decided", ["x", "x2"])],
      ["b.md", proposal("b.md", "adopted", ["y"])],
    ]);
    expect(transitionProblems(base, head)).toEqual([]);
  });

  it("fails a new proposal that adopts what it names in the same pull request", () => {
    const head = new Map([["n.md", proposal("n.md", "adopted", ["side-panel"])]]);
    expect(transitionProblems(new Map(), head).join("\n")).toContain("cannot be adopted in the pull request that adds it");
  });

  it("allows a new adopted proposal that covers nothing the checks gate", () => {
    expect(transitionProblems(new Map(), new Map([["n.md", proposal("n.md", "adopted")]]))).toEqual([]);
  });

  it("fails a request that skips approval", () => {
    const problems = transitionProblems(new Map([["a.md", proposal("a.md", "open")]]), new Map([["a.md", proposal("a.md", "adopted")]]));
    expect(problems.join("\n")).toContain("moved open → adopted");
  });

  it("fails an adoption that widens what was approved", () => {
    const problems = transitionProblems(
      new Map([["a.md", proposal("a.md", "decided", ["side-panel"])]]),
      new Map([["a.md", proposal("a.md", "adopted", ["side-panel", "toast"])]]),
    );
    expect(problems.join("\n")).toContain("its changes cannot change");
  });

  it("does not compare a base file that has no fields yet", () => {
    const head = new Map([["a.md", proposal("a.md", "adopted", ["paths.web"])]]);
    expect(transitionProblems(new Map(), head, new Set(["a.md"]))).toEqual([]);
  });

  it("fails renaming a decided proposal, which would let the new name widen it", () => {
    const problems = transitionProblems(
      new Map([["9400.md", proposal("9400.md", "decided", ["probeThing"])]]),
      new Map([["9403.md", proposal("9403.md", "decided", ["probeThing", "probeFour"])]]),
    );
    expect(problems.join("\n")).toContain("9400.md is decided on the base and is gone from this change");
  });

  it("allows an open request to be withdrawn", () => {
    expect(transitionProblems(new Map([["a.md", proposal("a.md", "open", ["x"])]]), new Map())).toEqual([]);
  });

  it("fails moving an adopted proposal back", () => {
    const problems = transitionProblems(new Map([["a.md", proposal("a.md", "adopted")]]), new Map([["a.md", proposal("a.md", "decided")]]));
    expect(problems.join("\n")).toContain("moved adopted → decided");
  });
});

describe("names before graduate was renamed adopt", () => {
  const legacy = text("status: graduated\nchanges: []", BODY.replace("## Adoption", "## Graduation"));

  it("fails status: graduated and a ## Graduation section in the change, naming the new names", () => {
    const problems = parseProposal("p.md", legacy).problems;
    expect(problems).toEqual(['status "graduated" was renamed: write "status: adopted".', 'has "## Graduation", which was renamed: call the section "## Adoption".']);
  });

  it("reads them on the base as adopted and ## Adoption", () => {
    const parsed = parseProposal("p.md", legacy, { base: true });
    expect(parsed.problems).toEqual([]);
    expect(parsed.proposal?.status).toBe("adopted");
  });

  it("still fails a base proposal with neither section name", () => {
    expect(parseProposal("p.md", text("status: graduated\nchanges: []", "## Reason\n\nWhy.\n\n## Preview\n\nA frame.\n"), { base: true }).problems).toEqual([
      'has no "## Adoption" section.',
    ]);
  });

  it("lets a base proposal written before the rename be adopted, and keep its status, in a change that uses the new names", () => {
    const decided = text("status: decided\nchanges:\n  - side-panel", BODY.replace("## Adoption", "## Graduation"));
    const base = parseAll(new Map([["a.md", decided], ["b.md", legacy]]), { base: true });
    const head = parseAll(
      new Map([
        ["a.md", text("status: adopted\nchanges:\n  - side-panel")],
        ["b.md", text("status: adopted\nchanges: []")],
      ]),
    );
    expect([...base.unparsed, ...head.unparsed]).toEqual([]);
    expect(adopting(base.proposals, head.proposals).map((proposal) => proposal.file)).toEqual(["a.md"]);
    expect(transitionProblems(base.proposals, head.proposals)).toEqual([]);
  });
});

describe("parseAll", () => {
  it("counts only a file with no front matter as legacy, not one with broken fields", () => {
    const parsed = parseAll(
      new Map([
        ["old.md", "Status: decided.\n\n## Reason\n\nWhy.\n"],
        ["broken.md", text("status: open\nchanges: []", "## Reason\n\nWhy.\n")],
      ]),
    );
    expect([...parsed.unparsed].sort()).toEqual(["broken.md", "old.md"]);
    expect([...parsed.legacy]).toEqual(["old.md"]);
  });
});

const STATES = [
  "## States",
  "",
  "- **Pending:** the panel shows the record and its history.",
  "- **Empty:** the panel says the record has no history yet.",
  "- **Loading:** Out of scope, the history is local.",
  "- **Error:** Out of scope, the history is local.",
  "- **Long content:** a long history scrolls inside the panel.",
  "- **Permissions:** Out of scope, everyone who opens the record may read it.",
  "- **Over time:** an entry past its due date shows Overdue.",
  "",
].join("\n");

function withStates(states: string): string {
  return text("status: open\nchanges:\n  - side-panel", `${BODY}\n${states}`);
}

describe("## States", () => {
  it("reads each state, marking the ones out of scope", () => {
    const parsed = parseProposal("p.md", withStates(STATES));
    expect(parsed.problems).toEqual([]);
    expect(parsed.proposal?.states?.map((state) => state.name)).toEqual(["Pending", ...EDGE_STATES]);
    expect(parsed.proposal?.states?.filter((state) => state.outOfScope).map((state) => state.name)).toEqual(["Loading", "Error", "Permissions"]);
  });

  it("reads plain and bold names alike, in any case", () => {
    const states = ["## States", "", "- Pending: the record.", ...EDGE_STATES.map((edge) => `- **${edge.toLowerCase()}**: out of scope: nothing to show.`)].join("\n");
    expect(parseProposal("p.md", withStates(states)).problems).toEqual([]);
  });

  it("fails a section that names no edge case, one edge case at a time", () => {
    const problems = parseProposal("p.md", withStates("## States\n\n- Pending: the record.\n")).problems;
    expect(problems).toEqual(EDGE_STATES.map((edge) => `"## States" has no "${edge}" item. Say what the screen shows, or write "- ${edge}: Out of scope, <why>".`));
  });

  it("fails a section with only edge cases, which leaves the ordinary states unnamed", () => {
    const states = ["## States", "", ...EDGE_STATES.map((edge) => `- ${edge}: Out of scope, nothing loads.`)].join("\n");
    expect(parseProposal("p.md", withStates(states)).problems.join("\n")).toContain("lists only edge cases");
  });

  it("fails an out-of-scope state with no reason, and a state with no text", () => {
    const problems = parseProposal("p.md", withStates(STATES.replace("Out of scope, the history is local.", "Out of scope.").replace("an entry past its due date shows Overdue.", ""))).problems;
    expect(problems).toEqual(['"## States" item "Loading" is out of scope with no reason. Write "Out of scope, <why>".', '"## States" item "Over time" says nothing. Say what the screen shows, or write "Out of scope, <why>".']);
  });

  it("fails an empty section, an item that is not a state, and a state listed twice", () => {
    expect(parseProposal("p.md", withStates("## States\n\nEvery state is fine.\n")).problems.join("\n")).toContain('"## States" lists no states');
    const problems = parseProposal("p.md", withStates(`${STATES}- Pending, as above\n- pending: again.\n`)).problems;
    expect(problems).toEqual(['"## States" item "Pending, as above" is not "- <state>: <what the screen shows>".', '"## States" lists "pending" twice.']);
  });

  it("takes None alone for a change that shows on no screen, and fails it beside other states", () => {
    expect(parseProposal("p.md", withStates("## States\n\n- None: the change moves a config path.\n")).problems).toEqual([]);
    expect(parseProposal("p.md", withStates(`${STATES}- None: nothing.\n`)).problems.join("\n")).toContain('lists "None" beside other states');
  });

  it("does not read a state inside a code block, which only a bare fence closes", () => {
    const states = `${STATES}\n\`\`\`md\n- Approved\n\`\`\`\n`;
    expect(parseProposal("p.md", withStates(states)).problems).toEqual([]);
    const fenced = ["## States", "", "```", "```js", "- Pending: the record.", ...EDGE_STATES.map((edge) => `- ${edge}: Out of scope, none.`), "```", ""].join("\n");
    expect(parseProposal("p.md", withStates(fenced)).problems.join("\n")).toContain('"## States" lists no states');
  });

  it("reads items indented up to three spaces, and skips a thematic break", () => {
    const states = STATES.replace(/^- /gm, " - ").replace("- **Pending:**", "- **Pending:**") + "\n* * *\n";
    expect(parseProposal("p.md", withStates(states)).problems).toEqual([]);
  });

  it("reads a state whose text wraps onto an indented line", () => {
    const parsed = parseProposal("p.md", withStates(STATES.replace("- **Empty:** the panel says the record has no history yet.", "- **Empty:**\n  the panel says the record has no history yet.")));
    expect(parsed.problems).toEqual([]);
    expect(parsed.proposal?.states?.find((state) => state.name === "Empty")?.text).toBe("the panel says the record has no history yet.");
  });
});

describe("transitionProblems and ## States", () => {
  const unlisted = (file: string, status: Proposal["status"], changes: string[] = ["side-panel"]) => proposal(file, status, changes, [], null);

  it("fails a new proposal that changes members and lists no states", () => {
    const problems = transitionProblems(new Map(), new Map([["n.md", unlisted("n.md", "open")]]));
    expect(problems.join("\n")).toContain('n.md is new and changes side-panel, but has no "## States" section');
  });

  it("fails a new proposal that only adds and lists no states", () => {
    const adding: Proposal = { ...unlisted("n.md", "adopted", []), adds: ["Steps"] };
    expect(transitionProblems(new Map(), new Map([["n.md", adding]])).join("\n")).toContain("is new and adds Steps");
  });

  it("fails approving a request that lists no states", () => {
    const problems = transitionProblems(new Map([["a.md", unlisted("a.md", "open")]]), new Map([["a.md", unlisted("a.md", "decided")]]));
    expect(problems.join("\n")).toContain('a.md moves open → decided and changes side-panel, but has no "## States" section');
  });

  it("keeps proposals from before the section as they are: an open request edited, a decided one adopting", () => {
    const base = new Map([
      ["open.md", unlisted("open.md", "open")],
      ["decided.md", unlisted("decided.md", "decided")],
    ]);
    const head = new Map([
      ["open.md", unlisted("open.md", "open", ["side-panel", "toast"])],
      ["decided.md", unlisted("decided.md", "adopted")],
    ]);
    expect(transitionProblems(base, head)).toEqual([]);
  });

  it("asks a base file with no fields for states when it gains them, as a new proposal", () => {
    const problems = transitionProblems(new Map(), new Map([["a.md", unlisted("a.md", "decided")]]), new Set(["a.md"]));
    expect(problems.join("\n")).toContain('a.md is new and changes side-panel, but has no "## States" section');
  });

  it("asks a new proposal that starts decided for states", () => {
    expect(transitionProblems(new Map(), new Map([["n.md", unlisted("n.md", "decided")]])).join("\n")).toContain("is new and changes side-panel");
  });

  it("fails a decided proposal that drops the states it was approved with", () => {
    const problems = transitionProblems(new Map([["a.md", proposal("a.md", "decided", ["side-panel"])]]), new Map([["a.md", unlisted("a.md", "adopted")]]));
    expect(problems.join("\n")).toContain('a.md is decided on the base with a "## States" section, so it keeps one');
  });

  it("does not ask a proposal that changes no member for states", () => {
    expect(transitionProblems(new Map(), new Map([["n.md", unlisted("n.md", "adopted", [])]]))).toEqual([]);
  });
});

describe("nameProblems", () => {
  const base = ["proposals/0013-every-route.md"];

  it("passes a new proposal named for a day and a slug", () => {
    expect(nameProblems(base, [...base, "proposals/2026-11-12-steps-component.md"])).toEqual([]);
  });

  it("passes two parallel proposals on the same day, because their slugs differ", () => {
    expect(nameProblems(base, [...base, "proposals/2026-11-12-steps-component.md", "proposals/2026-11-12-hold-ends.md"])).toEqual([]);
  });

  it("keeps the numbered names already on the base", () => {
    expect(nameProblems(base, base)).toEqual([]);
  });

  it("fails a new proposal named by the next number, and suggests a dated name with its slug", () => {
    const problems = nameProblems(base, [...base, "proposals/0014-invoice-progress-steps.md"]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^proposals\/0014-invoice-progress-steps\.md is a new proposal/);
    expect(problems[0]).toMatch(/such as proposals\/\d{4}-\d{2}-\d{2}-invoice-progress-steps\.md\./);
  });

  it("fails a numbered proposal renamed in the change, because the new name is new", () => {
    expect(nameProblems(base, ["proposals/0013-every-route-in-budget.md"])).toHaveLength(1);
  });

  it("fails a day after tomorrow in UTC, and passes tomorrow for a writer ahead of UTC", () => {
    const today = new Date(Date.UTC(2026, 10, 11, 22));
    expect(nameProblems([], ["proposals/2026-11-12-steps.md"], today)).toEqual([]);
    expect(nameProblems([], ["proposals/2099-01-01-steps.md"], today)).toHaveLength(1);
  });

  it("fails a date that is not on the calendar, a slug with capitals, and a name with no slug", () => {
    const head = ["proposals/2026-02-30-steps.md", "proposals/2026-11-12-Steps.md", "proposals/2026-11-12.md", "proposals/26-11-12-steps.md"];
    expect(nameProblems([], head)).toHaveLength(4);
  });
});

describe("sharedNameProblems", () => {
  it("fails a new proposal whose name another proposal folder also holds", () => {
    const head = ["proposals/2026-11-12-steps.md", "products/nook/proposals/2026-11-12-steps.md"];
    expect(sharedNameProblems(["proposals/2026-11-12-steps.md"], head)).toEqual([
      "products/nook/proposals/2026-11-12-steps.md is a new proposal with the same name as proposals/2026-11-12-steps.md. A file name is the proposal's ID, so give it another slug.",
    ]);
  });

  it("passes the same day with different slugs, and leaves names already on the base alone", () => {
    expect(sharedNameProblems([], ["proposals/2026-11-12-steps.md", "products/nook/proposals/2026-11-12-hold.md"])).toEqual([]);
    const both = ["proposals/0001-a.md", "products/nook/proposals/0001-a.md"];
    expect(sharedNameProblems(both, both)).toEqual([]);
  });
});
