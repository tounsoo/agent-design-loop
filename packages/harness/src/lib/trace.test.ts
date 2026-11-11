import { describe, expect, it } from "vitest";
import designLoop from "../../design-loop";
import type { LoopGraph } from "./loop";
import { changedTraces, parseTrace, touchedProducts, traceProblems } from "./trace";

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
      { node: "proposal-pull-request" },
      { node: "approval", when: "approved" },
      { node: "graduate" },
      { node: "build" },
      { node: "checks", when: "pass" },
      { node: "note" },
      { node: "pull-request" },
    );
    expect(traceProblems(designLoop, walk)).toEqual([]);
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

  it("fails a trace whose last change to checked state has no passing eval node after it", () => {
    // A graph where a checkpoint can follow a failing eval node, as the design loop's proposal checkpoint can.
    const parked: LoopGraph = {
      ...graph,
      nodes: [...graph.nodes, { id: "park", kind: "checkpoint", label: "Park the work" }],
      edges: graph.edges.map((edge) => (edge.from === "ask" && edge.when === "declined" ? { ...edge, to: "park" } : edge)).concat({ from: "park", to: "ask" }),
    };
    const unchecked = lines({ node: "build" }, { node: "checks", when: "fail" }, { node: "fork", when: "outside" }, { node: "ask", when: "declined" }, { node: "park" });
    expect(traceProblems(parked, unchecked)).toEqual(["line 1: build writes ui, and no eval node that reads ui passes after it, so the run ends with unchecked work."]);
  });

  it("passes a partial walk, which loop:step checks as it appends", () => {
    expect(traceProblems(graph, lines({ node: "build" }, { node: "checks", when: "fail" }), { partial: true })).toEqual([]);
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

  it("reads the trace files a change adds or edits, and not one it deletes", () => {
    expect(changedTraces(files)).toEqual(["traces/meridian-board.jsonl"]);
  });

  it("reads the product directories a change touches", () => {
    expect(touchedProducts(files, ["products/meridian", "products/nook", "products/mer"])).toEqual(["products/meridian"]);
  });
});
