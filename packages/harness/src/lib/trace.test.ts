import { describe, expect, it } from "vitest";
import designLoop from "../../design-loop";
import type { LoopGraph } from "./loop";
import { changedTraces, parseTrace, touchedProducts, traceProblems, type LoopAt } from "./trace";

/** The same small loop loop.test.ts uses: build, check, retry on fail, ask a person, end. */
const graph: LoopGraph = {
  start: "build",
  state: [{ id: "ui", what: "The UI." }],
  nodes: [
    { id: "build", kind: "llm", label: "Build", writes: ["ui"] },
    { id: "checks", kind: "eval", label: "Check", run: ["check"], reads: ["ui"] },
    { id: "fork", kind: "router", label: "Inside?" },
    { id: "ask", kind: "human", label: "Approve", approver: "designer", gate: "/proposals/" },
    { id: "done", kind: "checkpoint", label: "Open the pull request" },
  ],
  edges: [
    { from: "build", to: "checks" },
    { from: "checks", to: "done", when: "pass" },
    { from: "checks", to: "fork", when: "fail" },
    { from: "fork", to: "build", when: "inside" },
    { from: "fork", to: "ask", when: "outside" },
    { from: "ask", to: "build", when: "approved" },
    { from: "ask", to: "build", when: "declined" },
  ],
};

const lines = (...steps: object[]): string => `${steps.map((step) => JSON.stringify(step)).join("\n")}\n`;
const pass = lines({ node: "build" }, { node: "checks", when: "pass" }, { node: "done" });

describe("traceProblems", () => {
  it("passes a walk from the start through a passing eval node to a checkpoint", () => {
    expect(traceProblems(graph, pass)).toEqual([]);
  });

  it("passes a walk that retries after a failing eval node", () => {
    const retry = lines(
      { node: "build" },
      { node: "checks", when: "fail" },
      { node: "fork", when: "inside" },
      { node: "build" },
      { node: "checks", when: "pass" },
      { node: "done", at: "2026-11-11T11:00:00Z" },
    );
    expect(traceProblems(graph, retry)).toEqual([]);
  });

  it("passes two runs, the second starting after the first ends", () => {
    expect(traceProblems(graph, `${pass}\n${pass}`)).toEqual([]);
  });

  it("passes a walk of the repository's design loop", () => {
    const walk = lines(
      { node: "read" },
      { node: "route", when: "needs a new pattern" },
      { node: "propose" },
      { node: "scope", when: "anything else" },
      { node: "proposal-pull-request" },
      { node: "approval", when: "approved" },
      { node: "adopt" },
      { node: "build" },
      { node: "checks", when: "pass" },
      { node: "screenshots" },
      { node: "critique", when: "pass" },
      { node: "note" },
      { node: "pull-request" },
    );
    expect(traceProblems(designLoop, walk)).toEqual([]);
  });

  it("passes a proposal that only adds, adopted in the same run, and fails one that skips the approval otherwise", () => {
    const oneRun = lines(
      { node: "read" },
      { node: "route", when: "needs a new pattern" },
      { node: "propose" },
      { node: "scope", when: "only adds" },
      { node: "adopt" },
      { node: "build" },
      { node: "checks", when: "pass" },
      { node: "screenshots" },
      { node: "critique", when: "pass" },
      { node: "note" },
      { node: "pull-request" },
    );
    expect(traceProblems(designLoop, oneRun)).toEqual([]);
    const skips = lines({ node: "read" }, { node: "route", when: "needs a new pattern" }, { node: "propose" }, { node: "adopt" });
    expect(traceProblems(designLoop, skips).join("\n")).toContain("propose");
  });

  it("passes a critique that sends the change back to build, and fails a revision that skips the gate", () => {
    const revised = lines(
      { node: "read" },
      { node: "route", when: "fits" },
      { node: "build" },
      { node: "checks", when: "pass" },
      { node: "screenshots" },
      { node: "critique", when: "revise" },
      { node: "build" },
      { node: "checks", when: "pass" },
      { node: "screenshots" },
      { node: "critique", when: "pass" },
      { node: "note" },
      { node: "pull-request" },
    );
    expect(traceProblems(designLoop, revised)).toEqual([]);
    const skips = lines({ node: "read" }, { node: "route", when: "fits" }, { node: "build" }, { node: "checks", when: "pass" }, { node: "screenshots" }, { node: "critique", when: "revise" }, { node: "note" });
    expect(traceProblems(designLoop, skips).join("\n")).toContain("goes from critique when revise to note, an edge the graph does not have. It goes to build.");
    const skipped = lines({ node: "read" }, { node: "route", when: "fits" }, { node: "build" }, { node: "checks", when: "pass" }, { node: "screenshots" }, { node: "note" });
    expect(traceProblems(designLoop, skipped).join("\n")).toContain("goes from screenshots to note, an edge the graph does not have. It goes to critique.");
  });

  it("fails an empty trace", () => {
    expect(traceProblems(graph, "\n")).toEqual(["the trace has no steps."]);
  });

  it("fails a line that is not JSON, or has unknown keys", () => {
    expect(traceProblems(graph, "build\n")).toEqual(["line 1 is not JSON."]);
    expect(traceProblems(graph, lines({ node: "build", by: "agent" }))).toContain("line 1 has unknown keys: by. A step has node, when and at.");
  });

  it("fails a walk that does not begin at the start", () => {
    expect(traceProblems(graph, lines({ node: "checks", when: "pass" }, { node: "done" }))).toContain("line 1 starts at checks. A run starts at build.");
  });

  it("fails a node the graph does not have", () => {
    expect(traceProblems(graph, lines({ node: "build" }, { node: "ship" }))).toContain("line 2 names ship, which is not a node of the design loop.");
  });

  it("fails a step between nodes no edge connects", () => {
    const skip = lines({ node: "build" }, { node: "done" });
    expect(traceProblems(graph, skip)).toContain("line 2 goes from build to done, an edge the graph does not have. It goes to checks.");
  });

  it("fails a step that does not follow the outcome its node recorded", () => {
    const wrong = lines({ node: "build" }, { node: "checks", when: "fail" }, { node: "done" });
    expect(traceProblems(graph, wrong)).toContain("line 3 goes from checks when fail to done, an edge the graph does not have. It goes to fork.");
  });

  it("fails an outcome node with no when, or a when it has no edge for", () => {
    expect(traceProblems(graph, lines({ node: "build" }, { node: "checks" }))).toContain("line 2: eval node checks needs a when, one of pass, fail.");
    expect(traceProblems(graph, lines({ node: "build" }, { node: "checks", when: "skipped" }))).toContain(
      "line 2: eval node checks has no edge for when skipped. Its edges are pass, fail.",
    );
  });

  it("fails a when on a node with no outcomes", () => {
    expect(traceProblems(graph, lines({ node: "build", when: "fits" }))).toContain("line 1: llm node build has no outcomes, so its step takes no when.");
  });

  it("fails a run that continues past an end without starting again", () => {
    expect(traceProblems(graph, `${pass}${lines({ node: "checks", when: "pass" })}`)).toContain(
      "line 4 follows done, which ends the run, so a new run starts at build, not checks.",
    );
  });

  it("fails a trace that stops before a checkpoint", () => {
    expect(traceProblems(graph, lines({ node: "build" }))).toContain(
      "the trace ends at build on line 1, which is not a checkpoint, so the run's work is not saved for review.",
    );
  });

  it("fails a trace whose run ends on a change to checked state no passing eval node follows", () => {
    // check:loop refuses such a graph, so this one is built to let a run give up after a failing check.
    const givesUp: LoopGraph = { ...graph, edges: [...graph.edges, { from: "fork", to: "done", when: "give up" }] };
    const unchecked = lines({ node: "build" }, { node: "checks", when: "fail" }, { node: "fork", when: "give up" }, { node: "done" });
    expect(traceProblems(givesUp, unchecked)).toEqual(["line 1: build writes ui, and no eval node that reads ui passes after it, so the run ends with unchecked work."]);
  });

  it("passes a run paused at a checkpoint with an edge out, though its work is unchecked, and a new run after it", () => {
    // The design loop's proposal checkpoint: the gate failed, the fix is outside the inventories, so the run waits on approval.
    const paused = lines(
      { node: "read" },
      { node: "route", when: "fits" },
      { node: "build" },
      { node: "checks", when: "fail" },
      { node: "triage", when: "outside" },
      { node: "propose" },
      { node: "scope", when: "anything else" },
      { node: "proposal-pull-request" },
    );
    expect(traceProblems(designLoop, paused)).toEqual([]);
    const next = lines({ node: "read" }, { node: "route", when: "fits" }, { node: "build" }, { node: "checks", when: "pass" }, { node: "screenshots" }, { node: "critique", when: "pass" }, { node: "note" }, { node: "pull-request" });
    expect(traceProblems(designLoop, `${paused}${next}`)).toEqual([]);
  });

  it("reads a trace that starts with a byte order mark", () => {
    expect(traceProblems(graph, `\uFEFF${pass}`)).toEqual([]);
  });

  it("passes a partial walk, which loop:step checks as it appends", () => {
    expect(traceProblems(graph, lines({ node: "build" }, { node: "checks", when: "fail" }), { partial: true })).toEqual([]);
  });
});

describe("traceProblems across a change of loop", () => {
  // The same loop after it gained a review step between the passing check and the checkpoint, as the design loop gained critique.
  const reviewed: LoopGraph = {
    ...graph,
    nodes: [...graph.nodes, { id: "review", kind: "llm", label: "Review" }],
    edges: [...graph.edges.filter((edge) => !(edge.from === "checks" && edge.when === "pass")), { from: "checks", to: "review", when: "pass" }, { from: "review", to: "done" }],
  };
  /** Lines up to `last` were recorded under `graph`, the rest under `reviewed`. */
  const changedAfter = (last: number): LoopAt => (line) => (line <= last ? graph : reviewed);

  it("fails a run recorded before the loop changed when every line is read against today's loop, the bug this guards", () => {
    expect(traceProblems(reviewed, pass)).toContain("line 3 goes from checks when pass to done, an edge the graph does not have. It goes to review.");
  });

  it("passes a run recorded before the loop changed, read against the loop of its day", () => {
    expect(traceProblems(changedAfter(3), pass)).toEqual([]);
  });

  it("passes a new run after the change, walked under the new loop", () => {
    const next = lines({ node: "build" }, { node: "checks", when: "pass" }, { node: "review" }, { node: "done" });
    expect(traceProblems(changedAfter(3), `${pass}${next}`)).toEqual([]);
  });

  it("fails a new run after the change that walks the old loop", () => {
    expect(traceProblems(changedAfter(3), `${pass}${pass}`)).toContain("line 6 goes from checks when pass to done, an edge the graph does not have. It goes to review.");
  });

  it("lets a run cut off by the change start over at the new loop's start, though it stopped short of a checkpoint", () => {
    const restarted = lines({ node: "build" }, { node: "build" }, { node: "checks", when: "pass" }, { node: "review" }, { node: "done" });
    expect(traceProblems(changedAfter(1), restarted)).toEqual([]);
    // Without a change of loop, the same step back to the start is an edge the graph does not have.
    expect(traceProblems(reviewed, restarted)).toContain("line 2 goes from build to build, an edge the graph does not have. It goes to checks.");
  });

  it("goes on with a run cut off by the change along the new loop's edges, and fails one that keeps to the old loop's", () => {
    const goesOn = lines({ node: "build" }, { node: "checks", when: "pass" }, { node: "review" }, { node: "done" });
    expect(traceProblems(changedAfter(2), goesOn)).toEqual([]);
    expect(traceProblems(changedAfter(2), pass)).toContain(
      "line 3 goes from checks when pass to done, an edge the graph does not have. It goes to review. The design loop changed after line 2, and this step follows the loop it was recorded under.",
    );
  });

  it("treats a loop that only rewords a label or reorders its lists as the same loop, so a run cut there cannot start over", () => {
    const reworded: LoopGraph = { ...graph, nodes: [...graph.nodes].reverse().map((node) => ({ ...node, label: `${node.label}, reworded` })), edges: [...graph.edges].reverse() };
    const cut = lines({ node: "build" }, { node: "build" });
    expect(traceProblems((line) => (line <= 1 ? graph : reworded), cut, { partial: true })).toEqual(["line 2 goes from build to build, an edge the graph does not have. It goes to checks."]);
  });

  it("goes on from a checkpoint that ended the run under the old loop along an edge the new loop adds out of it", () => {
    const reopened: LoopGraph = { ...graph, edges: [...graph.edges, { from: "done", to: "checks" }] };
    const walk = lines({ node: "build" }, { node: "checks", when: "pass" }, { node: "done" }, { node: "checks", when: "pass" }, { node: "done" });
    expect(traceProblems((line) => (line <= 3 ? graph : reopened), walk)).toEqual([]);
  });

  it("fails a step that goes on from a node the new loop dropped", () => {
    const dropped: LoopGraph = { ...reviewed, nodes: reviewed.nodes.filter((node) => node.id !== "fork"), edges: reviewed.edges.filter((edge) => edge.from !== "fork" && edge.to !== "fork") };
    const walk = lines({ node: "build" }, { node: "checks", when: "fail" }, { node: "fork", when: "inside" }, { node: "ask", when: "approved" });
    expect(traceProblems((line) => (line <= 3 ? graph : dropped), walk, { partial: true })).toEqual([
      "line 4 follows line 3, and the two were recorded under different versions of the design loop: the one line 4 was recorded under has no node fork. Where the loop changes, a new run starts at build.",
    ]);
  });
});

describe("parseTrace", () => {
  it("skips blank lines and keeps each step's line number", () => {
    expect(parseTrace(`\n${JSON.stringify({ node: "build" })}\n`)).toEqual({ steps: [{ line: 2, node: "build" }] });
  });
});

describe("changedTraces and touchedProducts", () => {
  const files = [
    { status: "A", path: "traces/meridian-board.jsonl" },
    { status: "D", path: "traces/old.jsonl" },
    { status: "M", path: "traces/notes.md" },
    { status: "M", path: "products/meridian/features/board.tsx" },
  ];

  it("reads the trace files a change adds or edits, not one it deletes, and names any other file it adds there", () => {
    expect(changedTraces([...files, { status: "A", path: "traces/README.md" }])).toEqual({ traces: ["traces/meridian-board.jsonl"], misnamed: ["traces/notes.md"] });
  });

  it("reads the product directories a change touches, and a product at the root holds every file", () => {
    expect(touchedProducts(files, ["products/meridian", "products/nook", "products/mer"])).toEqual(["products/meridian"]);
    expect(touchedProducts([{ status: "M", path: "README.md" }], ["."])).toEqual(["."]);
  });
});
