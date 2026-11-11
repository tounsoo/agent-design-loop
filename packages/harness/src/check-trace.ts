import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import designLoop from "../design-loop";
import { resolveBaseRev, tryGit } from "./lib/base";
import { changedTraces, touchedProducts, traceProblems, TRACE_DIR, type ChangedFile } from "./lib/trace";

/**
 * Reads the change against its base, as check:inventories does, and checks
 * every loop trace the change adds or edits under traces/ against the design
 * loop graph. A change that touches a product's directory, the folder of any
 * harness.config.ts outside the harness package, must add or edit one. It
 * takes no --config: the loop is the harness's, and the trace is the change's.
 *
 * A trace is the agent's own record of its walk, so passing shows the record
 * is one the graph allows, not that the agent did the work it names.
 */

if (process.argv.length > 2) {
  console.error("check:trace takes no arguments. It reads the change against INVENTORY_BASE, or the merge base with main.");
  process.exit(1);
}

const harnessDir = path.relative(process.cwd(), path.dirname(path.dirname(fileURLToPath(import.meta.url)))).split(path.sep).join("/");

const base = resolveBaseRev("trace");
if ("problem" in base) {
  console.error(base.problem);
  process.exit(1);
}

function changedFiles(rev: string): ChangedFile[] {
  const diff = tryGit(["diff", "--name-status", "-M", rev, "--"]);
  const untracked = tryGit(["ls-files", "--others", "--exclude-standard"]);
  if (diff === null || untracked === null) {
    console.error(`trace: cannot diff the working tree against ${rev}.`);
    process.exit(1);
  }
  const files: ChangedFile[] = [];
  for (const line of diff.split("\n").filter(Boolean)) {
    const [status = "", ...paths] = line.split("\t");
    // A rename or copy changes both paths: the old one goes, the new one comes.
    if (paths.length === 2 && paths[0] && paths[1]) {
      if (status.startsWith("R")) files.push({ status: "D", path: paths[0] });
      files.push({ status: "A", path: paths[1] });
    } else if (paths[0]) files.push({ status, path: paths[0] });
  }
  for (const file of untracked.split("\n").filter(Boolean)) files.push({ status: "A", path: file });
  return files;
}

/** Each product's directory: the folder of every harness.config.ts git knows of outside the harness package, at the head or the base. */
function productDirs(rev: string): string[] {
  const head = tryGit(["ls-files", "--cached", "--others", "--exclude-standard"]) ?? "";
  const atBase = tryGit(["ls-tree", "-r", "--name-only", rev]) ?? "";
  const configs = `${head}\n${atBase}`
    .split("\n")
    .filter((file) => path.posix.basename(file) === "harness.config.ts" && !file.startsWith(`${harnessDir}/`));
  return [...new Set(configs.map((file) => path.posix.dirname(file)))].filter((dir) => dir !== ".").sort();
}

const files = changedFiles(base.rev);
const traces = changedTraces(files);
const products = touchedProducts(files, productDirs(base.rev));

let failed = false;
for (const trace of traces) {
  const problems = traceProblems(designLoop, existsSync(trace) ? readFileSync(trace, "utf8") : "");
  if (problems.length === 0) continue;
  failed = true;
  console.error(`trace: ${trace} is not a walk of the design loop graph:`);
  for (const problem of problems) console.error(`- ${problem}`);
}

if (products.length > 0 && traces.length === 0) {
  failed = true;
  console.error(`trace: the change touches ${products.join(", ")} and adds no loop trace under ${TRACE_DIR}/. Append one line per node as you walk packages/harness/design-loop.ts, with npm run loop:step.`);
}

if (failed) process.exit(1);
if (traces.length > 0) console.log(`trace: ${traces.join(", ")} ${traces.length === 1 ? "walks" : "walk"} the design loop graph, compared with ${base.rev}.`);
else console.log(`trace: the change touches no product and adds no trace, compared with ${base.rev}.`);
