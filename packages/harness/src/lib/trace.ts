import type { LoopGraph, LoopNode } from "./loop";

/**
 * A loop trace is the agent's record of walking the design loop graph: a
 * JSON Lines file under `traces/`, one line per node visited, appended as the
 * agent goes. A line is `{"node": "<id>"}`, with `"when": "<outcome>"` on a
 * router, eval or human node, the edge it took, and an optional `"at"` time.
 *
 * The trace shows that the agent recorded a walk the graph allows. It does
 * not prove the agent did the work each line names: nothing runs the graph,
 * and the agent writes its own trace. It gives a reviewer a record to hold
 * the diff against, and `check:trace` fails a record the graph could not
 * produce.
 */

export const TRACE_DIR = "traces";

export type TraceStep = { readonly node: string; readonly when?: string; readonly at?: string };

const KEYS = new Set(["node", "when", "at"]);

/** The steps of a trace file, or the problems that stop it parsing. Blank lines are skipped. */
export function parseTrace(text: string): { steps: (TraceStep & { line: number })[] } | { problems: string[] } {
  const steps: (TraceStep & { line: number })[] = [];
  const problems: string[] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    if (raw.trim() === "") return;
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      problems.push(`line ${line} is not JSON.`);
      return;
    }
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      problems.push(`line ${line} is not a JSON object.`);
      return;
    }
    const record = value as Record<string, unknown>;
    const unknown = Object.keys(record).filter((key) => !KEYS.has(key));
    if (unknown.length > 0) problems.push(`line ${line} has unknown keys: ${unknown.join(", ")}. A step has node, when and at.`);
    for (const key of KEYS) {
      if (record[key] !== undefined && typeof record[key] !== "string") problems.push(`line ${line} has a ${key} that is not a string.`);
    }
    if (typeof record.node !== "string") {
      if (record.node === undefined) problems.push(`line ${line} has no node.`);
      return;
    }
    steps.push({
      line,
      node: record.node,
      ...(typeof record.when === "string" ? { when: record.when } : {}),
      ...(typeof record.at === "string" ? { at: record.at } : {}),
    });
  });
  return problems.length > 0 ? { problems } : { steps };
}

const hasOutcomes = (node: LoopNode): boolean => node.kind === "router" || node.kind === "eval" || node.kind === "human";

/**
 * What is wrong with a walk of the graph. An empty list means the walk is one
 * the graph allows. With `partial`, the walk may stop anywhere, which is how
 * `loop:step` checks a trace still being written. Otherwise it must stop at a
 * checkpoint, and every change to state an eval node reads must be followed by
 * a passing eval node that reads it.
 */
export function walkProblems(graph: LoopGraph, steps: readonly (TraceStep & { line: number })[], options: { partial?: boolean } = {}): string[] {
  const problems: string[] = [];
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const isEnd = (id: string): boolean => !graph.edges.some((edge) => edge.from === id);
  if (steps.length === 0) return ["the trace has no steps."];

  steps.forEach((step, index) => {
    const node = nodes.get(step.node);
    if (!node) {
      problems.push(`line ${step.line} names ${step.node}, which is not a node of the design loop.`);
      return;
    }
    const out = graph.edges.filter((edge) => edge.from === node.id);
    if (hasOutcomes(node)) {
      const whens = out.map((edge) => edge.when ?? "");
      if (step.when === undefined) problems.push(`line ${step.line}: ${node.kind} node ${node.id} needs a when, one of ${whens.join(", ")}.`);
      else if (!whens.includes(step.when)) problems.push(`line ${step.line}: ${node.kind} node ${node.id} has no edge for when ${step.when}. Its edges are ${whens.join(", ")}.`);
    } else if (step.when !== undefined) {
      problems.push(`line ${step.line}: ${node.kind} node ${node.id} has no outcomes, so its step takes no when.`);
    }

    const previous = steps[index - 1];
    if (!previous) {
      if (node.id !== graph.start) problems.push(`line ${step.line} starts at ${node.id}. A run starts at ${graph.start}.`);
      return;
    }
    if (!nodes.has(previous.node)) return;
    if (isEnd(previous.node)) {
      if (node.id !== graph.start) problems.push(`line ${step.line} follows ${previous.node}, which ends the run, so a new run starts at ${graph.start}, not ${node.id}.`);
      return;
    }
    const taken = graph.edges.filter((edge) => edge.from === previous.node && (edge.when === undefined || edge.when === previous.when));
    if (!taken.some((edge) => edge.to === node.id)) {
      const after = previous.when === undefined ? previous.node : `${previous.node} when ${previous.when}`;
      const next = taken.map((edge) => edge.to).join(" or ");
      problems.push(`line ${step.line} goes from ${after} to ${node.id}, an edge the graph does not have.${next ? ` It goes to ${next}.` : ""}`);
    }
  });
  if (options.partial) return problems;

  const last = steps[steps.length - 1];
  const lastNode = last ? nodes.get(last.node) : undefined;
  if (last && lastNode && lastNode.kind !== "checkpoint") {
    problems.push(`the trace ends at ${last.node} on line ${last.line}, which is not a checkpoint, so the run's work is not saved for review.`);
  }

  // Every state an eval node reads, written after the last eval node that reads it passed, is unchecked work.
  const checked = new Set(graph.nodes.flatMap((node) => (node.kind === "eval" ? (node.reads ?? []) : [])));
  const unchecked = new Map<string, TraceStep & { line: number }>();
  for (const step of steps) {
    const node = nodes.get(step.node);
    if (!node) continue;
    if (node.kind === "eval" && step.when === "pass") for (const id of node.reads ?? []) unchecked.delete(id);
    for (const id of node.writes ?? []) if (checked.has(id) && !unchecked.has(id)) unchecked.set(id, step);
  }
  for (const [state, step] of unchecked) {
    problems.push(`line ${step.line}: ${step.node} writes ${state}, and no eval node that reads ${state} passes after it, so the run ends with unchecked work.`);
  }
  return problems;
}

/** The problems with a trace file's text: parse problems first, then walk problems. */
export function traceProblems(graph: LoopGraph, text: string, options: { partial?: boolean } = {}): string[] {
  const parsed = parseTrace(text);
  return "problems" in parsed ? parsed.problems : walkProblems(graph, parsed.steps, options);
}

/** A change's files, as `git diff --name-status` gives them, plus untracked files as added. */
export type ChangedFile = { readonly status: string; readonly path: string };

/** The trace files a change adds or edits. A deleted trace is not one. */
export function changedTraces(files: readonly ChangedFile[]): string[] {
  return files
    .filter((file) => !file.status.startsWith("D") && file.path.startsWith(`${TRACE_DIR}/`) && file.path.endsWith(".jsonl"))
    .map((file) => file.path)
    .sort();
}

/** The product directories a change touches, given each product's directory. */
export function touchedProducts(files: readonly ChangedFile[], productDirs: readonly string[]): string[] {
  return productDirs.filter((dir) => files.some((file) => file.path.startsWith(`${dir}/`))).sort();
}
