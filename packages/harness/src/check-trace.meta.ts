import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "A change that touches a product carries a loop trace, and every trace it adds or edits is a walk the design loop graph allowed when each step was recorded.",
  fails: [
    "A change that touches a product's directory, the folder of any `harness.config.ts` outside the harness package, and adds or edits no trace under `traces/`.",
    "A trace the change adds or edits that does not start at the graph's `start`, steps between nodes no edge connects, gives a router, eval or human step no `when` or one its edges lack, or stops anywhere but a checkpoint.",
    "A trace that ends its run with a change to checked state that no passing eval node follows. A run paused at a checkpoint with an edge out may stop unchecked.",
    "A file under `traces/` that is not a `.jsonl` trace or the folder's README.",
    "A trace line that is not a JSON object, has a key other than `node`, `when` and `at`, has a value that is not a string, has no `node`, or names a node the design loop does not have.",
    "A trace line added in a commit whose `packages/harness/design-loop.ts` is missing or is not a plain literal, so there is no loop to read the line against, a tracked trace `git blame` cannot read, or, in a shallow clone, a line dated to the clone's cut.",
  ],
  details: [
    "It is not in `npm run check`, because the eval node runs the gate in the middle of the walk, before the trace ends at a checkpoint. CI runs it after the build gate, and an agent runs it before pushing. `npm run loop:step` writes a trace step by step. A trace is the agent's own record, so passing shows the record is a walk the graph allows, not that the work was done: [proposal 0010](../../../proposals/0010-loop-trace.md). Only traces the change adds or edits are read.",
    "Each line is read against the design loop as it stood in the commit that added it, which `git blame` names, and a line not yet committed against the loop in the working tree (`lib/trace-history.ts`). So a run recorded before the loop changed still passes as the walk it was, and a pull request that merges `main` after the loop gained a step keeps its trace as it is. Where the loop changed between two steps, the later one may start a new run at the start or go on along the new loop's edges. A commit's loop counts only when it is the working tree's or the one the commit's merge base with the base held, so a line recorded under a loop a branch made, or copied from an older `main`, and then put back is read against today's. A line takes the newest loop of any line up to it, newest by the history of `design-loop.ts`, so a line someone edited later pulls the lines after it onto its loop. Two versions that differ only in labels or in the order of their lists are the same loop. A rebase re-dates every line it moves onto the new base's loop, so merge `main` in instead. `loop:step` and `critique` read a trace the same way.",
  ],
} satisfies CheckMeta;
