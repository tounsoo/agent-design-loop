import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { config, configName, loadInputs } from "./lib/config";
import { eventEdges, shortestPath, type TaskEdge } from "../src/flows/invoice-approval/shortest-path";

/**
 * Every task in the product inputs' tasks has one task graph module, named for
 * its task id under flows[].tasks in the harness config. The check measures
 * two paths per task against max_steps:
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
 *
 * `--graph <file>` measures one graph module against the task its taskId
 * export names, which is how the fixtures try a single broken graph.
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

const { tasks } = await loadInputs();
const graphFlag = flag("--graph");
const violations: string[] = [];

async function load(file: string): Promise<GraphModule> {
  return (await import(pathToFileURL(path.resolve(file)).href)) as GraphModule;
}

/** Task id → graph module path, from the config, or from the one --graph module. */
const graphFiles = new Map<string, string>();
if (graphFlag) {
  const module = await load(graphFlag);
  if (typeof module.taskId === "string") graphFiles.set(module.taskId, graphFlag);
  else violations.push(`step budget: ${graphFlag} does not export a taskId.`);
} else {
  for (const flow of config.flows) {
    for (const [taskId, file] of Object.entries(flow.tasks ?? {})) {
      const earlier = graphFiles.get(taskId);
      if (earlier) violations.push(`step budget: "${taskId}" has two task graphs in ${configName}: ${earlier}, ${file}.`);
      else graphFiles.set(taskId, file);
    }
  }
}

for (const [taskId, file] of graphFiles) {
  if (!tasks.some((task) => task.id === taskId)) {
    violations.push(`step budget: ${file} models "${taskId}", which is not in tasks.`);
  }
}

for (const task of tasks) {
  const file = graphFiles.get(task.id);
  if (!file) {
    if (!graphFlag) violations.push(`step budget: task "${task.id}" has no task graph. Map it to one under flows[].tasks in ${configName}.`);
    continue;
  }
  if (!existsSync(path.resolve(file))) {
    violations.push(`step budget: the task graph ${file} for "${task.id}" is missing.`);
    continue;
  }
  const module = await load(file);
  if (module.taskId !== undefined && module.taskId !== task.id) {
    violations.push(`step budget: ${file} exports taskId ${JSON.stringify(module.taskId)}, but ${configName} maps it to "${task.id}".`);
    continue;
  }
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
    // A single --graph fixture may model only the graph. A configured graph must ship its flow.
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

if (violations.length > 0) {
  for (const violation of violations) console.error(violation);
  process.exit(1);
}

console.log("step budget: within budget.");
