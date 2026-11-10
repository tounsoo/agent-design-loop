import path from "node:path";
import { pathToFileURL } from "node:url";
import { tasks } from "../src/inputs/product";
import { taskHappyPath } from "../src/flows/invoice-approval/graph";
import { shortestPath, type TaskEdge } from "../src/flows/invoice-approval/shortest-path";

const task = tasks.find((item) => item.id === "approve-vendor-invoice");
if (!task) {
  console.error("step budget: missing task approve-vendor-invoice");
  process.exit(1);
}

if (task.success_state !== "invoice-approved") {
  console.error(`step budget: success_state is ${task.success_state}, expected invoice-approved`);
  process.exit(1);
}

const graphArg = process.argv.indexOf("--graph");
let pathSteps: readonly string[] | null;
let label: string;

if (graphArg === -1) {
  pathSteps = taskHappyPath();
  label = "src/flows/invoice-approval/graph";
} else {
  const graphFile = process.argv[graphArg + 1];
  if (!graphFile) {
    console.error("step budget: missing --graph path");
    process.exit(1);
  }
  const loaded = (await import(pathToFileURL(path.resolve(graphFile)).href)) as {
    taskStart: unknown;
    taskEdges: readonly TaskEdge<unknown>[];
    isTaskSuccess: (node: unknown) => boolean;
  };
  pathSteps = shortestPath(loaded.taskStart, loaded.taskEdges, loaded.isTaskSuccess);
  label = graphFile;
}

if (!pathSteps) {
  console.error(`step budget: ${label} has no path to the success state`);
  process.exit(1);
}

console.log(`step budget: ${label}`);
console.log(`  path (${pathSteps.length}): ${pathSteps.join(" → ")}`);
console.log(`  max_steps: ${task.max_steps}`);

if (pathSteps.length > task.max_steps) {
  console.error(
    `step budget: path length ${pathSteps.length} exceeds max_steps ${task.max_steps} for ${task.id}.`,
  );
  process.exit(1);
}

console.log("step budget: within budget.");
