import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { tasks } from "../src/inputs/product";
import { eventEdges, shortestPath, type TaskEdge } from "../src/flows/invoice-approval/shortest-path";

/**
 * Every task in src/inputs/product.ts#tasks has one task graph, a graph.ts
 * under src/flows that exports its taskId. The check measures two paths per
 * task against max_steps:
 *
 * - the modeled path: the shortest path through the task graph;
 * - the shipped path: the shortest path through the flow's real transition
 *   reducer, from flowStart, over userEvents, to the task's success_state.
 *
 * The graph is the path the budget is set for. The reducer is what ships. Both
 * must fit, so a reducer that grows a step cannot hide behind a stale graph.
 * The two paths must also be the same steps, so a reducer that drops or swaps
 * a reviewed step, or a graph that keeps a step the reducer never needed,
 * fails too. Graph step names are the event types they stand for.
 * shortestPath returns the first shortest path in edge order. If a graph or
 * reducer ever has two shortest paths, order its edges or userEvents so the
 * reviewed one comes first.
 */

type GraphModule = {
  taskId?: unknown;
  taskStart: unknown;
  taskEdges: readonly TaskEdge<unknown>[];
  isTaskSuccess: (node: unknown) => boolean;
  flowStart?: unknown;
  userEvents?: readonly { readonly type: string }[];
  transition?: (state: unknown, event: { readonly type: string }) => unknown;
};

function flag(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    console.error(`step budget: missing ${name} path`);
    process.exit(1);
  }
  return value;
}

const graphFlag = flag("--graph");
const flowsRoot = path.resolve(flag("--flows") ?? "src/flows");
const violations: string[] = [];

async function load(file: string): Promise<GraphModule> {
  return (await import(pathToFileURL(path.resolve(file)).href)) as GraphModule;
}

function graphFiles(): string[] {
  if (graphFlag) return [path.resolve(graphFlag)];
  if (!existsSync(flowsRoot)) return [];
  return readdirSync(flowsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(flowsRoot, entry.name, "graph.ts"))
    .filter((file) => existsSync(file));
}

const byTask = new Map<string, { file: string; module: GraphModule }[]>();
for (const file of graphFiles()) {
  const module = await load(file);
  const label = path.relative(process.cwd(), file);
  if (typeof module.taskId !== "string") {
    violations.push(`step budget: ${label} does not export a taskId.`);
    continue;
  }
  const list = byTask.get(module.taskId) ?? [];
  list.push({ file: label, module });
  byTask.set(module.taskId, list);
}

for (const [taskId, graphs] of byTask) {
  if (!tasks.some((task) => task.id === taskId)) {
    violations.push(`step budget: ${graphs.map((graph) => graph.file).join(", ")} models "${taskId}", which is not in tasks.`);
  }
  if (graphs.length > 1) {
    violations.push(`step budget: "${taskId}" has ${graphs.length} task graphs: ${graphs.map((graph) => graph.file).join(", ")}.`);
  }
}

for (const task of tasks) {
  const graph = byTask.get(task.id)?.[0];
  if (!graph) {
    if (!graphFlag) violations.push(`step budget: task "${task.id}" has no task graph under ${path.relative(process.cwd(), flowsRoot)}.`);
    continue;
  }
  const { file, module } = graph;
  console.log(`step budget: ${task.id} (max_steps ${task.max_steps}), ${file}`);

  const modeled = shortestPath(module.taskStart, module.taskEdges, module.isTaskSuccess);
  if (!modeled) {
    violations.push(`step budget: ${file} has no modeled path to the success state.`);
  } else {
    console.log(`  modeled path (${modeled.length}): ${modeled.join(" → ")}`);
    if (modeled.length > task.max_steps) {
      violations.push(`step budget: modeled path length ${modeled.length} exceeds max_steps ${task.max_steps} for ${task.id}.`);
    }
  }

  const { flowStart, userEvents, transition } = module;
  if (flowStart === undefined || !userEvents || typeof transition !== "function") {
    // A single --graph fixture may model only the graph. A discovered graph must ship its flow.
    if (!graphFlag) violations.push(`step budget: ${file} does not export flowStart, userEvents and transition, so the shipped flow is not measured.`);
    continue;
  }
  const reached = (state: unknown) =>
    typeof state === "object" && state !== null && (state as { status?: unknown }).status === task.success_state;
  const shipped = shortestPath(flowStart, eventEdges(userEvents, transition), reached);
  if (!shipped) {
    violations.push(`step budget: the shipped flow in ${file} never reaches ${task.success_state}.`);
    continue;
  }
  console.log(`  shipped path (${shipped.length}): ${shipped.join(" → ")}`);
  if (shipped.length > task.max_steps) {
    violations.push(`step budget: shipped flow path length ${shipped.length} exceeds max_steps ${task.max_steps} for ${task.id}.`);
  }
  if (modeled && shipped.join(" → ") !== modeled.join(" → ")) {
    violations.push(
      `step budget: shipped flow path ${shipped.join(" → ")} does not match the modeled path ${modeled.join(" → ")} for ${task.id}. Update the task graph or the reducer so they agree.`,
    );
  }
}

if (graphFlag && byTask.size === 0 && violations.length === 0) {
  violations.push(`step budget: ${graphFlag} models no task.`);
}

if (violations.length > 0) {
  for (const violation of violations) console.error(violation);
  process.exit(1);
}

console.log("step budget: within budget.");
