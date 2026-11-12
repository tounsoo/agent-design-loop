import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "A change that touches a product carries a loop trace, and every trace it adds or edits is a walk the design loop graph allows.",
  fails: [
    "A change that touches a product's directory, the folder of any `harness.config.ts` outside the harness package, and adds or edits no trace under `traces/`.",
    "A trace the change adds or edits that does not start at the graph's `start`, steps between nodes no edge connects, gives a router, eval or human step no `when` or one its edges lack, or stops anywhere but a checkpoint.",
    "A trace that ends its run with a change to checked state that no passing eval node follows. A run paused at a checkpoint with an edge out may stop unchecked.",
    "A file under `traces/` that is not a `.jsonl` trace or the folder's README.",
    "A trace line that is not a JSON object, has a key other than `node`, `when` and `at`, has a value that is not a string, has no `node`, or names a node the design loop does not have.",
  ],
  details: [
    "It is not in `npm run check`, because the eval node runs the gate in the middle of the walk, before the trace ends at a checkpoint. CI runs it after the build gate, and an agent runs it before pushing. `npm run loop:step` writes a trace step by step. A trace is the agent's own record, so passing shows the record is a walk the graph allows, not that the work was done: [proposal 0010](../../../proposals/0010-loop-trace.md). Only traces the change adds or edits are read.",
  ],
} satisfies CheckMeta;
