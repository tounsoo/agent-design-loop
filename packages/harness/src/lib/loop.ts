/**
 * The design loop as a graph: nodes do the work, edges decide what runs
 * next, and shared state carries what one run leaves for the next. The graph
 * is data an agent follows. No runtime executes it, so `check:loop` is what
 * keeps it honest: its eval nodes name real scripts, its human nodes name a
 * review CODEOWNERS requests, and every path that ends passes the checks.
 */

/** What a node is. An `llm` node is the agent's own work. */
export type NodeKind = "llm" | "router" | "eval" | "human" | "checkpoint";

type NodeBase = {
  readonly id: string;
  /** What the node does, in one sentence. A router's label is its question. */
  readonly label: string;
  /** Shared state the node reads, by id. */
  readonly reads?: readonly string[];
  /** Shared state the node writes, by id. */
  readonly writes?: readonly string[];
};

export type LoopNode =
  | (NodeBase & { readonly kind: "llm" })
  | (NodeBase & { readonly kind: "router" })
  /** Runs npm scripts. Its `pass` edge is taken when every script exits 0, its `fail` edge otherwise. */
  | (NodeBase & { readonly kind: "eval"; readonly run: readonly string[] })
  /** Waits for a person. `gate` is the CODEOWNERS pattern whose review is the approval. */
  | (NodeBase & { readonly kind: "human"; readonly approver: string; readonly gate: string })
  /** Saves the run's work where the next run and the reviewer can read it. With no edge out, the run ends here. */
  | (NodeBase & { readonly kind: "checkpoint" });

/** `when` is the outcome that selects the edge. Only routers, eval nodes and human nodes have outcomes. */
export type LoopEdge = { readonly from: string; readonly to: string; readonly when?: string };

export type LoopState = { readonly id: string; readonly what: string };

export type LoopGraph = {
  readonly start: string;
  readonly state: readonly LoopState[];
  readonly nodes: readonly LoopNode[];
  readonly edges: readonly LoopEdge[];
};

/** The outcomes each kind's edges must carry, exactly. Null means unlabeled edges, at most `max`. */
const OUTCOMES: { readonly [K in NodeKind]: { readonly when: readonly string[] | null; readonly min: number; readonly max: number } } = {
  llm: { when: null, min: 1, max: 1 },
  router: { when: null, min: 2, max: Infinity },
  eval: { when: ["pass", "fail"], min: 2, max: 2 },
  human: { when: ["approved", "declined"], min: 2, max: 2 },
  checkpoint: { when: null, min: 0, max: 1 },
};

export type LoopContext = {
  /** The repository's npm scripts, by name. */
  readonly scripts: { readonly [name: string]: string };
  /** The text of the CODEOWNERS file. */
  readonly codeowners: string;
};

/** CODEOWNERS patterns whose last line names at least one owner. A later line with no owner unassigns the pattern. */
function ownedPatterns(codeowners: string): Set<string> {
  const owned = new Set<string>();
  for (const line of codeowners.split(/\r?\n/)) {
    const [pattern, ...owners] = line.replace(/#.*/, "").trim().split(/\s+/);
    if (!pattern) continue;
    if (owners.length > 0) owned.add(pattern);
    else owned.delete(pattern);
  }
  return owned;
}

const mermaidId = (id: string): string => id.replace(/[^\w]/g, "_");

function reachable(from: string, edges: readonly LoopEdge[]): Set<string> {
  const seen = new Set<string>([from]);
  const queue = [from];
  for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
    for (const edge of edges) {
      if (edge.from === id && !seen.has(edge.to)) {
        seen.add(edge.to);
        queue.push(edge.to);
      }
    }
  }
  return seen;
}

/** What is wrong with a loop graph. An empty list means `check:loop` passes it. */
export function loopProblems(graph: LoopGraph, context: LoopContext): string[] {
  const problems: string[] = [];
  const nodes = new Map<string, LoopNode>();
  const drawn = new Map<string, string>();
  for (const node of graph.nodes) {
    if (nodes.has(node.id)) problems.push(`node ${node.id} is defined twice.`);
    nodes.set(node.id, node);
    const other = drawn.get(mermaidId(node.id));
    if (other !== undefined && other !== node.id) problems.push(`nodes ${other} and ${node.id} draw as the same node in the diagram.`);
    drawn.set(mermaidId(node.id), node.id);
  }
  const stateIds = new Set<string>();
  for (const state of graph.state) {
    if (stateIds.has(state.id)) problems.push(`state ${state.id} is defined twice.`);
    stateIds.add(state.id);
  }
  if (!nodes.has(graph.start)) problems.push(`start ${graph.start} is not a node.`);

  for (const edge of graph.edges) {
    for (const end of [edge.from, edge.to]) {
      if (!nodes.has(end)) problems.push(`edge ${edge.from} -> ${edge.to} names ${end}, which is not a node.`);
    }
  }
  const edges = graph.edges.filter((edge) => nodes.has(edge.from) && nodes.has(edge.to));

  const owned = ownedPatterns(context.codeowners);
  const used = new Set<string>();
  for (const node of graph.nodes) {
    for (const text of [node.label, ...edges.filter((edge) => edge.from === node.id).map((edge) => edge.when ?? "")]) {
      if (/["|]/.test(text)) problems.push(`node ${node.id} has a double quote or a | in ${text}, which the diagram cannot draw.`);
    }
    for (const id of [...(node.reads ?? []), ...(node.writes ?? [])]) {
      if (stateIds.has(id)) used.add(id);
      else problems.push(`node ${node.id} names state ${id}, which the graph does not declare.`);
    }

    const out = edges.filter((edge) => edge.from === node.id);
    const rule = OUTCOMES[node.kind];
    const labels = out.map((edge) => edge.when);
    if (rule.when !== null) {
      const expected = [...rule.when].sort().join(", ");
      const found = labels.map((label) => label ?? "(none)").sort().join(", ");
      if (found !== expected) problems.push(`${node.kind} node ${node.id} needs edges for ${expected}, found ${found || "none"}.`);
    } else if (out.length < rule.min || out.length > rule.max) {
      const range = rule.max === Infinity ? `at least ${rule.min}` : rule.min === rule.max ? `${rule.min}` : `${rule.min} to ${rule.max}`;
      problems.push(`${node.kind} node ${node.id} needs ${range} edges out, found ${out.length}.`);
    } else if (node.kind === "router") {
      if (labels.some((label) => !label)) problems.push(`router node ${node.id} has an edge with no when.`);
      else if (new Set(labels).size !== labels.length) problems.push(`router node ${node.id} has two edges with the same when.`);
    } else if (labels.some((label) => label !== undefined)) {
      problems.push(`${node.kind} node ${node.id} has a when on its edge, but only routers, eval and human nodes have outcomes.`);
    }

    if (node.kind === "eval") {
      if (node.run.length === 0) problems.push(`eval node ${node.id} runs no script.`);
      for (const script of node.run) {
        if (!Object.hasOwn(context.scripts, script)) problems.push(`eval node ${node.id} runs ${script}, which is not an npm script.`);
        else if (script !== "check" && !script.startsWith("check:")) problems.push(`eval node ${node.id} runs ${script}, which is not a check. An eval node runs check or a check: script.`);
      }
      for (const edge of edges.filter((edge) => edge.to === node.id)) {
        const writes = nodes.get(edge.from)?.writes ?? [];
        if (!writes.some((id) => node.reads?.includes(id))) {
          problems.push(`eval node ${node.id} is reached from ${edge.from}, which writes none of the state ${node.id} reads, so the checks would run on unchanged work.`);
        }
      }
      const fail = out.find((edge) => edge.when === "fail");
      if (fail && !reachable(fail.to, edges).has(node.id)) problems.push(`eval node ${node.id}'s fail edge never comes back to it, so a failing run has no retry.`);
    }
    if (node.kind === "human" && !owned.has(node.gate)) {
      problems.push(`human node ${node.id} gates on ${node.gate}, which no CODEOWNERS line assigns to an owner.`);
    }
  }
  for (const state of graph.state) {
    if (!used.has(state.id)) problems.push(`state ${state.id} is never read or written.`);
  }

  if (nodes.has(graph.start)) {
    const fromStart = reachable(graph.start, edges);
    for (const node of graph.nodes) {
      if (!fromStart.has(node.id)) problems.push(`node ${node.id} is not reachable from ${graph.start}.`);
    }
    const ends = graph.nodes.filter((node) => !edges.some((edge) => edge.from === node.id)).map((node) => node.id);
    if (ends.length === 0) problems.push("no node ends the run.");
    for (const node of graph.nodes) {
      if (fromStart.has(node.id) && !ends.some((end) => reachable(node.id, edges).has(end))) problems.push(`node ${node.id} cannot reach an end.`);
    }
    const unchecked = reachable(graph.start, edges.filter((edge) => !(nodes.get(edge.from)?.kind === "eval" && edge.when === "pass")));
    for (const end of ends.filter((id) => unchecked.has(id))) problems.push(`node ${end} ends the run on a path that passes no eval node.`);
  }
  return problems;
}

const SHAPES: { readonly [K in NodeKind]: readonly [string, string] } = {
  llm: ["[", "]"],
  router: ["{", "}"],
  eval: ["[[", "]]"],
  human: ["([", "])"],
  checkpoint: ["[(", ")]"],
};

/** The graph as a Mermaid flowchart, one line per node and per edge, in the graph's own order. */
export function loopMermaid(graph: LoopGraph): string {
  const lines = ["flowchart TB"];
  for (const node of graph.nodes) {
    const [open, close] = SHAPES[node.kind];
    lines.push(`  ${mermaidId(node.id)}${open}"${node.kind}: ${node.label}"${close}`);
  }
  for (const edge of graph.edges) {
    const label = edge.when ? `|${edge.when}|` : "";
    lines.push(`  ${mermaidId(edge.from)} -->${label} ${mermaidId(edge.to)}`);
  }
  return lines.join("\n");
}

export const DIAGRAM_START = "<!-- design-loop:start, drawn by npm run check:loop -- --write -->";
export const DIAGRAM_END = "<!-- design-loop:end -->";

/**
 * The doc with its diagram block redrawn from the graph, or a problem when
 * the doc has no single block between the markers. `stale` says whether the
 * block differed from the drawing.
 */
export function redrawDiagram(doc: string, graph: LoopGraph): { text: string; stale: boolean } | { problem: string } {
  const from = doc.indexOf(DIAGRAM_START);
  const to = doc.indexOf(DIAGRAM_END);
  if (from === -1 || to < from || doc.indexOf(DIAGRAM_START, from + 1) !== -1 || doc.indexOf(DIAGRAM_END, to + 1) !== -1) {
    return { problem: `needs one diagram block between ${DIAGRAM_START} and ${DIAGRAM_END}.` };
  }
  const drawn = `${DIAGRAM_START}\n\n\`\`\`mermaid\n${loopMermaid(graph)}\n\`\`\`\n\n`;
  return { text: doc.slice(0, from) + drawn + doc.slice(to), stale: doc.slice(from, to) !== drawn };
}
