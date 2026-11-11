import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import designLoop from "../../design-loop";
import { DIAGRAM_END, DIAGRAM_START, loopMermaid, loopProblems, redrawDiagram, type LoopEdge, type LoopGraph, type LoopNode } from "./loop";

const context = { scripts: { check: "npm run test", dev: "vite" }, codeowners: "/proposals/ @owner\n/unowned/\n/disowned/ @owner\n/disowned/\n" };

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

  it("fails an eval node that runs a script that is not a check", () => {
    const nodes = base.nodes.map((node) => (node.kind === "eval" ? { ...node, run: ["dev"] } : node));
    expect(loopProblems(graph({ nodes }), context)).toContain("eval node checks runs dev, which is not a check. An eval node runs check or a check: script.");
  });

  it("fails a node id that is not lowercase words joined by hyphens", () => {
    const nodes = base.nodes.map((node) => (node.id === "done" ? { ...node, id: "pull_request" } : node));
    const edges = base.edges.map((edge) => (edge.to === "done" ? { ...edge, to: "pull_request" } : edge));
    expect(loopProblems(graph({ nodes, edges }), context)).toContain("node pull_request needs an id of lowercase words joined by hyphens.");
  });

  it("fails a label or a when the diagram cannot draw", () => {
    const edges = base.edges.map((edge) => (edge.when === "inside" ? { ...edge, when: "in|side" } : edge));
    expect(loopProblems(graph({ edges }), context)).toContain("node fork has a double quote or a | in in|side, which the diagram cannot draw.");
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
    for (const gate of ["/unowned/", "/missing/", "/disowned/"]) {
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
    expect(loopProblems(graph({ edges, start: "fork" }), context)).toContain("node done is reached from the start, fork, without passing an eval node.");
  });

  it("fails work after the checks pass that reaches an end unchecked", () => {
    const polish = { id: "polish", kind: "llm", label: "Polish", writes: ["ui"] } as const;
    const edges = [...base.edges.filter((edge) => edge.when !== "pass"), { from: "checks", to: "polish", when: "pass" }, { from: "polish", to: "done" }];
    expect(loopProblems(graph({ nodes: [...base.nodes, polish], edges }), context)).toContain(
      "node done is reached from polish, which writes checked state, without passing an eval node.",
    );
  });

  it("fails a failing eval that can still end the run", () => {
    const edges = [...base.edges.filter((edge) => edge.when !== "outside"), { from: "fork", to: "done", when: "outside" }];
    expect(loopProblems(graph({ edges }), context)).toContain("node done is reached from checks's fail edge without passing an eval node.");
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

  it("fails an eval node reached from a node that writes nothing it checks", () => {
    const edges = base.edges.map((edge) => (edge.when === "inside" ? { ...edge, to: "checks" } : edge));
    expect(loopProblems(graph({ edges }), context)).toContain(
      "eval node checks is reached from fork, which writes none of the state checks reads, so the checks would run on unchanged work.",
    );
  });

  it("fails an llm node with two edges out, and a checkpoint with two", () => {
    const edges = [...base.edges, { from: "build", to: "done" }, { from: "done", to: "build" }, { from: "done", to: "checks" }];
    const problems = loopProblems(graph({ edges }), context);
    expect(problems).toContain("llm node build needs 1 edges out, found 2.");
    expect(problems).toContain("checkpoint node done needs 0 to 1 edges out, found 2.");
  });

  it("fails a start that is not a node", () => {
    expect(loopProblems(graph({ start: "begin" }), context)).toContain("start begin is not a node.");
  });
});

describe("redrawDiagram", () => {
  const block = (body: string): string => `# Doc\n\n${DIAGRAM_START}\n${body}${DIAGRAM_END}\n`;

  it("finds a stale diagram, and leaves a redrawn one alone", () => {
    const redrawn = redrawDiagram(block("```mermaid\nflowchart TB\n```\n"), base);
    expect(redrawn).toMatchObject({ stale: true });
    if (!("text" in redrawn)) throw new Error("expected a redrawn doc");
    expect(redrawn.text).toContain(loopMermaid(base));
    expect(redrawDiagram(redrawn.text, base)).toEqual({ text: redrawn.text, stale: false });
  });

  it("fails a doc with no block or two", () => {
    expect(redrawDiagram("# Doc\n", base)).toHaveProperty("problem");
    expect(redrawDiagram(block("") + block(""), base)).toHaveProperty("problem");
  });
});

describe("loopMermaid", () => {
  it("draws each node in its kind's shape and each edge with its when", () => {
    const drawn = loopMermaid(base);
    expect(drawn).toContain('n_checks[["eval: Check"]]');
    expect(drawn).toContain('n_fork{"router: Inside?"}');
    expect(drawn).toContain("n_checks -->|fail| n_fork");
    expect(drawn).toContain("n_build --> n_checks");
  });
});
