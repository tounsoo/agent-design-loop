import { describe, expect, it } from "vitest";
import { addingInThisChange, graduating, nameProblems, parseAll, parseProposal, transitionProblems, type Proposal } from "./proposals";

const BODY = "# Proposal 0102: Add a side panel\n\n## Reason\n\nA frame beside the page.\n\n## Preview\n\n```\n[page | panel]\n```\n\n## Graduation, after approval\n\n- inputs\n";

function text(front: string, body = BODY): string {
  return `---\n${front}\n---\n${body}`;
}

function proposal(file: string, status: Proposal["status"], changes: string[] = [], retires: string[] = []): Proposal {
  return { file, status, changes, retires, optsOut: [], adds: [] };
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
    });
  });

  it("takes [] as an empty list and leaves the optional lists empty", () => {
    expect(parseProposal("p.md", text("status: open\nchanges: []")).proposal).toMatchObject({ changes: [], retires: [], optsOut: [] });
  });

  it("fails a file whose words match the old keywords but has no front matter", () => {
    const parsed = parseProposal("p.md", "Status: decided.\n\nThe reason is a preview of the graduation for side-panel.\n");
    expect(parsed.proposal).toBeNull();
    expect(parsed.problems.join("\n")).toContain("has no front matter");
  });

  it("requires status and changes", () => {
    expect(parseProposal("p.md", text("retires: []")).problems).toEqual(['front matter has no "status".', 'front matter has no "changes".']);
  });

  it("fails an unknown status or key", () => {
    const problems = parseProposal("p.md", text("status: approved\nchanges: []\nowner: ben")).problems.join("\n");
    expect(problems).toContain('unknown key "owner"');
    expect(problems).toContain("status must be one of open, decided, graduated");
  });

  it("fails changes written as a sentence instead of a list", () => {
    expect(parseProposal("p.md", text("status: open\nchanges: side-panel")).problems.join("\n")).toContain('"changes" must be a list');
  });

  it("fails a missing or empty section", () => {
    const body = "## Reason\n\n## Preview\n\nA preview.\n";
    const problems = parseProposal("p.md", text("status: open\nchanges: []", body)).problems;
    expect(problems).toEqual(['"## Reason" section is empty.', 'has no "## Graduation" section.']);
  });

  it("does not take a section heading inside a code block", () => {
    const body = "## Reason\n\nWhy.\n\n## Preview\n\n```md\n## Graduation\n\nNothing.\n```\n";
    expect(parseProposal("p.md", text("status: open\nchanges: []", body)).problems).toEqual(['has no "## Graduation" section.']);
  });

  it("fails a quoted value or a comment, which would match nothing", () => {
    const problems = parseProposal("p.md", text('status: decided\nchanges:\n  - "Tooltip"\n  - Card # the card')).problems.join("\n");
    expect(problems).toContain('front matter value "\\"Tooltip\\"" has quotes or a comment');
    expect(problems).toContain('front matter value "Card # the card" has quotes or a comment');
  });

  it("does not take a section heading inside an HTML comment", () => {
    const body = "## Reason\n\nWhy.\n\n<!--\n## Preview\n\nTODO\n\n## Graduation\n\nTODO\n-->\n";
    expect(parseProposal("p.md", text("status: open\nchanges: []", body)).problems).toEqual(['has no "## Preview" section.', 'has no "## Graduation" section.']);
  });

  it("keeps a code block open past a fence line with an info string", () => {
    const body = "## Reason\n\nWhy.\n\n```\nexample\n```md\n## Preview\n\nInside.\n";
    expect(parseProposal("p.md", text("status: open\nchanges: []", body)).problems).toContain('has no "## Preview" section.');
  });

  it("fails an opts-out entry that does not name a rule and a product", () => {
    expect(parseProposal("p.md", text("status: graduated\nchanges: []\nopts-out:\n  - check:priority")).problems.join("\n")).toContain(
      'is not "<rule> for <product paths.source>"',
    );
  });
});

describe("a proposal that only adds", () => {
  it("reads adds on a graduated proposal that lists nothing else", () => {
    const parsed = parseProposal("p.md", text("status: graduated\nchanges: []\nadds:\n  - side-panel"));
    expect(parsed.problems).toEqual([]);
    expect(parsed.proposal).toMatchObject({ status: "graduated", changes: [], adds: ["side-panel"] });
  });

  it("fails adds alongside changes, retires or opts-out, so a mixed proposal cannot skip approval", () => {
    for (const extra of ["changes:\n  - TARGET_MIN_PX", "changes: []\nretires:\n  - check:disclosure", "changes: []\nopts-out:\n  - check:priority for products/nook"]) {
      const parsed = parseProposal("p.md", text(`status: graduated\n${extra}\nadds:\n  - side-panel`));
      expect(parsed.proposal).toBeNull();
      expect(parsed.problems.join("\n")).toContain("lists adds alongside");
    }
  });

  it("fails adds on an open or decided proposal: it graduates in the pull request that adds it", () => {
    for (const status of ["open", "decided"]) {
      const parsed = parseProposal("p.md", text(`status: ${status}\nchanges: []\nadds:\n  - side-panel`));
      expect(parsed.problems.join("\n")).toContain("lists adds, so its status is graduated");
    }
  });

  it("passes check:proposals as a new graduated proposal, and pins its adds once merged", () => {
    const adding: Proposal = { ...proposal("p.md", "graduated"), adds: ["side-panel"] };
    expect(transitionProblems(new Map(), new Map([["p.md", adding]]))).toEqual([]);
    const widened: Proposal = { ...adding, adds: ["side-panel", "Card"] };
    expect(transitionProblems(new Map([["p.md", adding]]), new Map([["p.md", widened]])).join("\n")).toContain("its adds cannot change");
  });

  it("covers only in the pull request that adds it", () => {
    const adding: Proposal = { ...proposal("p.md", "graduated"), adds: ["side-panel"] };
    const plain = proposal("q.md", "graduated");
    expect(addingInThisChange(new Map(), new Map([["p.md", adding], ["q.md", plain]]))).toEqual([adding]);
    expect(addingInThisChange(new Map([["p.md", adding]]), new Map([["p.md", adding]]))).toEqual([]);
  });
});

describe("graduating", () => {
  it("returns proposals decided on the base and graduated in the head, as the base has them", () => {
    const base = new Map([["a.md", proposal("base/a.md", "decided", ["side-panel"])]]);
    const head = new Map([["a.md", proposal("head/a.md", "graduated", ["side-panel", "toast"])]]);
    expect(graduating(base, head)).toEqual([proposal("head/a.md", "decided", ["side-panel"])]);
  });

  it("does not return a proposal the head adds, an open request, or one still decided", () => {
    const base = new Map([
      ["open.md", proposal("open.md", "open", ["x"])],
      ["still.md", proposal("still.md", "decided", ["y"])],
    ]);
    const head = new Map([
      ["new.md", proposal("new.md", "graduated", ["z"])],
      ["open.md", proposal("open.md", "graduated", ["x"])],
      ["still.md", proposal("still.md", "decided", ["y"])],
    ]);
    expect(graduating(base, head)).toEqual([]);
  });
});

describe("transitionProblems", () => {
  it("allows open → decided and decided → graduated", () => {
    const base = new Map([
      ["a.md", proposal("a.md", "open", ["x"])],
      ["b.md", proposal("b.md", "decided", ["y"])],
    ]);
    const head = new Map([
      ["a.md", proposal("a.md", "decided", ["x", "x2"])],
      ["b.md", proposal("b.md", "graduated", ["y"])],
    ]);
    expect(transitionProblems(base, head)).toEqual([]);
  });

  it("fails a new proposal that graduates what it names in the same pull request", () => {
    const head = new Map([["n.md", proposal("n.md", "graduated", ["side-panel"])]]);
    expect(transitionProblems(new Map(), head).join("\n")).toContain("cannot graduate in the pull request that adds it");
  });

  it("allows a new graduated proposal that covers nothing the checks gate", () => {
    expect(transitionProblems(new Map(), new Map([["n.md", proposal("n.md", "graduated")]]))).toEqual([]);
  });

  it("fails a request that skips approval", () => {
    const problems = transitionProblems(new Map([["a.md", proposal("a.md", "open")]]), new Map([["a.md", proposal("a.md", "graduated")]]));
    expect(problems.join("\n")).toContain("moved open → graduated");
  });

  it("fails a graduation that widens what was approved", () => {
    const problems = transitionProblems(
      new Map([["a.md", proposal("a.md", "decided", ["side-panel"])]]),
      new Map([["a.md", proposal("a.md", "graduated", ["side-panel", "toast"])]]),
    );
    expect(problems.join("\n")).toContain("its changes cannot change");
  });

  it("does not compare a base file that has no fields yet", () => {
    const head = new Map([["a.md", proposal("a.md", "graduated", ["paths.web"])]]);
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

  it("fails moving a graduated proposal back", () => {
    const problems = transitionProblems(new Map([["a.md", proposal("a.md", "graduated")]]), new Map([["a.md", proposal("a.md", "decided")]]));
    expect(problems.join("\n")).toContain("moved graduated → decided");
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
