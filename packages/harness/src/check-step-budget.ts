import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { config, configName, loadInputs } from "./lib/config";
import { eventEdges, measureRoutes, shortestPath, type RouteMeasure, type TaskEdge } from "./lib/shortest-path";

/**
 * Every task in the product inputs' tasks has one task graph module, named for
 * its task id under flows[].tasks in the harness config. The module exports
 * the same id as taskId, so a mapping cannot point a task at another task's
 * graph. The check measures
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
 *
 * The shortest path is not the only way through. Every route that finishes the
 * task must fit max_steps too, in the graph and in the reducer. A step is an
 * event that a task graph in the same flows[] entry names as a step, so in a
 * flow with a hold-room task and a book-room task, hold is a step of book-room
 * too, and hold then book is a route to book-room's success. A route takes any
 * steps the flow allows, never back to a state it has passed, then finishes
 * the shortest way any user event allows. Events no task names, such as an
 * optional look or Back, are detours a person chooses, so they count only when
 * the finish needs them. measureRoutes in lib/shortest-path.ts does the search.
 *
 * A flow state's name is its `status` field, the name the product inputs'
 * success_state uses. A flow whose states keep that name elsewhere exports
 * `flowStatus(state)` from the graph module to read it. A reached state with
 * no name fails, so a state shape without `status` cannot read as a flow that
 * never reaches success.
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
  flowStatus?: (state: unknown) => unknown;
};

const { tasks } = await loadInputs();
const violations: string[] = [];

async function load(file: string): Promise<GraphModule> {
  return (await import(pathToFileURL(path.resolve(file)).href)) as GraphModule;
}

/** Task id → graph module path, from the config. */
const graphFiles = new Map<string, string>();
/** Task id → the graph paths of every task in its flows[] entry, its own included. */
const flowFiles = new Map<string, readonly string[]>();
for (const flow of config.flows) {
  const files = Object.values(flow.tasks ?? {});
  for (const [taskId, file] of Object.entries(flow.tasks ?? {})) {
    const earlier = graphFiles.get(taskId);
    if (earlier) violations.push(`step budget: "${taskId}" has two task graphs in ${configName}: ${earlier}, ${file}.`);
    else {
      graphFiles.set(taskId, file);
      flowFiles.set(taskId, files);
    }
  }
}

/**
 * The flow's steps: every step a task graph in the same flows[] entry names. A
 * graph that does not load or has no edges adds none; its own task reports it.
 */
async function flowSteps(taskId: string): Promise<Set<string>> {
  const names = new Set<string>();
  for (const file of flowFiles.get(taskId) ?? []) {
    if (!existsSync(path.resolve(file))) continue;
    const { taskEdges } = await load(file);
    if (!Array.isArray(taskEdges)) continue;
    for (const edge of taskEdges as readonly TaskEdge<unknown>[]) names.add(edge.step);
  }
  return names;
}

function reportRoutes(measure: RouteMeasure, which: string, file: string, taskId: string, maxSteps: number): void {
  if (measure.kind === "over") {
    violations.push(
      `step budget: the ${which} route ${measure.route.join(" → ")} takes ${measure.route.length} steps, which exceeds max_steps ${maxSteps} for ${taskId}. Every route that finishes the task must fit, not only the shortest.`,
    );
  } else if (measure.kind === "too-many") {
    violations.push(
      `step budget: the ${which} in ${file} passed the route search's limit of ${measure.limit} for ${taskId}, so not every route was measured. Cut the steps a person can take before finishing.`,
    );
  } else if (measure.longest) {
    console.log(`  longest ${which} route (${measure.longest.length}): ${measure.longest.join(" → ")}`);
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
    violations.push(`step budget: task "${task.id}" has no task graph. Map it to one under flows[].tasks in ${configName}.`);
    continue;
  }
  if (!existsSync(path.resolve(file))) {
    violations.push(`step budget: the task graph ${file} for "${task.id}" is missing.`);
    continue;
  }
  const module = await load(file);
  if (module.taskId !== task.id) {
    violations.push(
      module.taskId === undefined
        ? `step budget: ${file} does not export a taskId, so nothing in the graph says it models "${task.id}".`
        : `step budget: ${file} exports taskId ${JSON.stringify(module.taskId)}, but ${configName} maps it to "${task.id}".`,
    );
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
    } else {
      const graphSteps = new Set(module.taskEdges.map((edge) => edge.step));
      reportRoutes(measureRoutes(module.taskStart, module.taskEdges, module.isTaskSuccess, graphSteps, task.max_steps), "modeled", file, task.id, task.max_steps);
    }
  }

  const { flowStart, userEvents, transition } = module;
  if (flowStart === undefined || !userEvents || typeof transition !== "function") {
    violations.push(`step budget: ${file} does not export flowStart, userEvents and transition, so the shipped flow is not measured.`);
    continue;
  }
  if (module.flowStatus !== undefined && typeof module.flowStatus !== "function") {
    violations.push(`step budget: ${file} exports flowStatus, but it is not a function.`);
    continue;
  }
  const statusOf = (state: unknown): unknown =>
    module.flowStatus ? module.flowStatus(state) : typeof state === "object" && state !== null ? (state as { status?: unknown }).status : undefined;
  const unnamed: unknown[] = [];
  const reached = (state: unknown) => {
    const status = statusOf(state);
    if (typeof status !== "string") unnamed.push(state);
    return status === task.success_state;
  };
  const unnamedViolation = () =>
    module.flowStatus
      ? `step budget: flowStatus in ${file} gives no state name for ${JSON.stringify(unnamed[0])}.`
      : `step budget: the shipped flow in ${file} reaches ${JSON.stringify(unnamed[0])}, which has no status field. Export flowStatus(state) from the graph module to name its states.`;
  const shipped = shortestPath(flowStart, eventEdges(userEvents, transition), reached);
  if (unnamed.length > 0) {
    violations.push(unnamedViolation());
    continue;
  }
  if (!shipped) {
    violations.push(`step budget: the shipped flow in ${file} never reaches ${task.success_state}.`);
    continue;
  }
  console.log(`  shipped path (${shipped.length}): ${shipped.join(" → ")}`);
  if (shipped.length > task.max_steps) {
    violations.push(`step budget: shipped flow path length ${shipped.length} exceeds max_steps ${task.max_steps} for ${task.id}.`);
  } else {
    const steps = await flowSteps(task.id);
    const routes = measureRoutes(flowStart, eventEdges(userEvents, transition), reached, steps, task.max_steps);
    // A route can reach states the shortest search stopped before.
    if (unnamed.length > 0) violations.push(unnamedViolation());
    else reportRoutes(routes, "shipped flow", file, task.id, task.max_steps);
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
