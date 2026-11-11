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
  // -z keeps a path with spaces or non-ASCII letters as it is. Without it git quotes the path, and a quoted path matches no folder.
  const diff = tryGit(["diff", "-z", "--name-status", "-M", rev, "--"]);
  const untracked = tryGit(["ls-files", "-z", "--others", "--exclude-standard"]);
  if (diff === null || untracked === null) {
    console.error(`trace: cannot diff the working tree against ${rev}.`);
    process.exit(1);
  }
  const files: ChangedFile[] = [];
  const fields = diff.split("\0");
  for (let index = 0; index < fields.length; ) {
    const status = fields[index++] ?? "";
    if (status === "") continue;
    // A rename or copy names two paths: the old one goes, the new one comes.
    if (status.startsWith("R") || status.startsWith("C")) {
      const from = fields[index++] ?? "";
      const to = fields[index++] ?? "";
      if (status.startsWith("R")) files.push({ status: "D", path: from });
      files.push({ status: "A", path: to });
    } else files.push({ status, path: fields[index++] ?? "" });
  }
  for (const file of untracked.split("\0").filter(Boolean)) files.push({ status: "A", path: file });
  return files;
}

/** Each product's directory: the folder of every harness.config.ts git knows of outside the harness package, at the head or the base. */
function productDirs(rev: string): string[] {
  const head = tryGit(["ls-files", "-z", "--cached", "--others", "--exclude-standard"]) ?? "";
  const atBase = tryGit(["ls-tree", "-z", "-r", "--name-only", rev]) ?? "";
  const configs = `${head}\0${atBase}`
    .split("\0")
    .filter((file) => path.posix.basename(file) === "harness.config.ts" && !file.startsWith(`${harnessDir}/`));
  return [...new Set(configs.map((file) => path.posix.dirname(file)))].sort();
}

const files = changedFiles(base.rev);
const { traces, misnamed } = changedTraces(files);
const products = touchedProducts(files, productDirs(base.rev));

let failed = false;
if (misnamed.length > 0) {
  failed = true;
  console.error(`trace: ${misnamed.join(", ")} ${misnamed.length === 1 ? "is" : "are"} under ${TRACE_DIR}/ but not a .jsonl trace, so check:trace would not read ${misnamed.length === 1 ? "it" : "them"}. Name a trace <change>.jsonl.`);
}
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
