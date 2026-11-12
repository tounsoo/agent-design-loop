import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import designLoop from "../design-loop";
import { traceProblems, TRACE_DIR } from "./lib/trace";
import { loopBase, recordedLoops } from "./lib/trace-history";

/**
 * Appends one step to a loop trace: `npm run loop:step -- <trace> <node> [when]`.
 * The trace is a file under traces/, one per change. The step is refused when
 * the trace with it is not a walk the design loop graph allows, so a wrong
 * edge shows up at the step that takes it, not at check:trace. Steps already
 * committed are read against the loop of their commit, as check:trace reads
 * them, and the new step against the loop in the working tree.
 */

const [file, node, when, ...rest] = process.argv.slice(2);
if (!file || !node || rest.length > 0) {
  console.error("loop:step takes a trace file, a node id and, for a router, eval or human node, the when it took: npm run loop:step -- traces/<change>.jsonl checks pass");
  process.exit(1);
}
const normalized = path.posix.normalize(file.split(path.sep).join("/"));
if (!normalized.startsWith(`${TRACE_DIR}/`) || !normalized.endsWith(".jsonl") || normalized.includes("..")) {
  console.error(`loop:step writes only a .jsonl file under ${TRACE_DIR}/, not ${file}.`);
  process.exit(1);
}

const step = JSON.stringify({ node, ...(when === undefined ? {} : { when }), at: new Date().toISOString() });
const before = existsSync(normalized) ? readFileSync(normalized, "utf8") : "";
const separator = before === "" || before.endsWith("\n") ? "" : "\n";
const loops = recordedLoops(normalized, designLoop, loopBase());
const problems = "problems" in loops ? loops.problems : traceProblems(loops.loopAt, `${before}${separator}${step}\n`, { partial: true });
if (problems.length > 0) {
  console.error(`loop:step: not added to ${normalized}:`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
mkdirSync(path.posix.dirname(normalized), { recursive: true });
appendFileSync(normalized, `${separator}${step}\n`);
console.log(`loop:step: ${normalized} now ends at ${node}${when === undefined ? "" : ` (${when})`}.`);
