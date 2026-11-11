import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import designLoop from "../../design-loop";
import { loopMermaid, loopProblems, type LoopEdge, type LoopGraph, type LoopNode } from "./loop";

const context = { scripts: { check: "npm run test" }, codeowners: "/proposals/ @owner\n/unowned/\n" };

/** A small valid loop: build, check, retry on fail, ask a person, end. */
function graph(change: { nodes?: LoopNode[]; edges?: LoopEdge[]; start?: string } = {}): LoopGraph {
  return {
    start: change.start ?? "build",
    state: [{ id: "ui", what: "The UI." }],
    nodes: change.nodes ?? [
      { id: "build", kind: "llm", label: "Build", writes: ["ui"] },
      { id: "checks", kind: "eval", label: "Check", run: ["check"], reads: ["ui"] },
      { id: "fork", kind: "router", label: "Inside?" },
      { id: "ask", kind: "human", label: "Approve", approver: "designer", gate: "/proposals/" },
      { id: "done", kind: "checkpoint", label: "Open the pull request" },
    ],
    edges: change.edges ?? [
      { from: "build", to: "checks" },
      { from: "checks", to: "done", when: "pass" },
      { from: "checks", to: "fork", when: "fail" },
      { from: "fork", to: "build", when: "inside" },
      { from: "fork", to: "ask", when: "outside" },
      { from: "ask", to: "build", when: "approved" },
      { from: "ask", to: "build", when: "declined" },
    ],
  };
}

const base = graph();

describe("loopProblems", () => {
  it("passes a valid loop", () => {
    expect(loopProblems(base, context)).toEqual([]);
  });

  it("passes the repository's design loop", () => {
    const scripts = (JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> }).scripts;
    expect(loopProblems(designLoop, { scripts, codeowners: readFileSync("CODEOWNERS", "utf8") })).toEqual([]);
  });

  it("fails an edge to a node that does not exist", () => {
    const problems = loopProblems(graph({ edges: [...base.edges, { from: "done", to: "ship" }] }), context);
    expect(problems).toContain("edge done -> ship names ship, which is not a node.");
  });

  it("fails a node no edge reaches", () => {
    const nodes = [...base.nodes, { id: "orphan", kind: "checkpoint", label: "Orphan" } as const];
    expect(loopProblems(graph({ nodes }), context)).toContain("node orphan is not reachable from build.");
  });

  it("fails an eval node that runs a script package.json does not have", () => {
    const nodes = base.nodes.map((node) => (node.kind === "eval" ? { ...node, run: ["check:colors"] } : node));
    expect(loopProblems(graph({ nodes }), context)).toContain("eval node checks runs check:colors, which is not an npm script.");
  });

  it("fails an eval node without both a pass and a fail edge", () => {
    const edges = base.edges.filter((edge) => edge.when !== "fail");
    expect(loopProblems(graph({ edges }), context)).toContain("eval node checks needs edges for fail, pass, found pass.");
  });

  it("fails an eval node whose fail edge never comes back to retry", () => {
    const edges = base.edges.map((edge) => (edge.when === "fail" ? { ...edge, to: "done" } : edge));
    expect(loopProblems(graph({ edges }), context)).toContain("eval node checks's fail edge never comes back to it, so a failing run has no retry.");
  });

  it("fails a human gate no CODEOWNERS line assigns to an owner", () => {
    for (const gate of ["/unowned/", "/missing/"]) {
      const nodes = base.nodes.map((node) => (node.kind === "human" ? { ...node, gate } : node));
      expect(loopProblems(graph({ nodes }), context)).toContain(`human node ask gates on ${gate}, which no CODEOWNERS line assigns to an owner.`);
    }
  });

  it("fails a human node without approved and declined edges", () => {
    const edges = base.edges.filter((edge) => edge.when !== "declined");
    expect(loopProblems(graph({ edges }), context)).toContain("human node ask needs edges for approved, declined, found approved.");
  });

  it("fails a router with one way out or a repeated when", () => {
    const one = base.edges.filter((edge) => edge.when !== "outside");
    expect(loopProblems(graph({ edges: one }), context)).toContain("router node fork needs at least 2 edges out, found 1.");
    const twice = base.edges.map((edge) => (edge.when === "outside" ? { ...edge, when: "inside" } : edge));
    expect(loopProblems(graph({ edges: twice }), context)).toContain("router node fork has two edges with the same when.");
  });

  it("fails an llm node with a when on its edge", () => {
    const edges = base.edges.map((edge) => (edge.from === "build" ? { ...edge, when: "done" } : edge));
    expect(loopProblems(graph({ edges }), context)).toContain(
      "llm node build has a when on its edge, but only routers, eval and human nodes have outcomes.",
    );
  });

  it("fails a run that can end without passing an eval node", () => {
    const edges = [...base.edges.filter((edge) => edge.when !== "approved"), { from: "ask", to: "done", when: "approved" }];
    expect(loopProblems(graph({ edges }), context)).toContain("node done ends the run on a path that passes no eval node.");
  });

  it("fails a loop that never ends", () => {
    const nodes = base.nodes.filter((node) => node.id !== "done");
    const edges = base.edges.map((edge) => (edge.when === "pass" ? { ...edge, to: "build" } : edge));
    expect(loopProblems(graph({ nodes, edges }), context)).toContain("no node ends the run.");
  });

  it("fails state no node declares, and state no node uses", () => {
    const nodes = base.nodes.map((node) => (node.id === "build" ? { ...node, writes: ["screens"] } : node.id === "checks" ? { ...node, reads: [] } : node));
    const problems = loopProblems(graph({ nodes }), context);
    expect(problems).toContain("node build names state screens, which the graph does not declare.");
    expect(problems).toContain("state ui is never read or written.");
  });

  it("fails a start that is not a node", () => {
    expect(loopProblems(graph({ start: "begin" }), context)).toContain("start begin is not a node.");
  });
});

describe("loopMermaid", () => {
  it("draws each node in its kind's shape and each edge with its when", () => {
    const drawn = loopMermaid(base);
    expect(drawn).toContain('checks[["eval: Check"]]');
    expect(drawn).toContain('fork{"router: Inside?"}');
    expect(drawn).toContain("checks -->|fail| fork");
    expect(drawn).toContain("build --> checks");
  });
});
