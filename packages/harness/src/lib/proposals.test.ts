import { describe, expect, it } from "vitest";
import { graduating, parseProposal, transitionProblems, type Proposal } from "./proposals";

const BODY = "# Proposal 0102: Add a side panel\n\n## Reason\n\nA frame beside the page.\n\n## Preview\n\n```\n[page | panel]\n```\n\n## Graduation, after approval\n\n- inputs\n";

function text(front: string, body = BODY): string {
  return `---\n${front}\n---\n${body}`;
}

function proposal(file: string, status: Proposal["status"], changes: string[] = [], retires: string[] = []): Proposal {
  return { file, status, changes, retires, optsOut: [] };
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

  it("fails an opts-out entry that does not name a rule and a product", () => {
    expect(parseProposal("p.md", text("status: graduated\nchanges: []\nopts-out:\n  - check:priority")).problems.join("\n")).toContain(
      'is not "<rule> for <product paths.source>"',
    );
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

  it("fails moving a graduated proposal back", () => {
    const problems = transitionProblems(new Map([["a.md", proposal("a.md", "graduated")]]), new Map([["a.md", proposal("a.md", "decided")]]));
    expect(problems.join("\n")).toContain("moved graduated → decided");
  });
});
