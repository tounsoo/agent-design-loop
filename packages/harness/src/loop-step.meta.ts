import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Appends one step to a change's loop trace, and refuses a step the design loop graph does not allow.",
  tool: true,
  details: [
    "Run it as `npm run loop:step -- traces/<change>.jsonl <node> [when]`, with the `when` of the edge taken out of a router, eval or human node. It writes only a `.jsonl` file under `traces/`, so a wrong edge shows up at the step that takes it, not at `check:trace`. `traces/README.md` has the format.",
  ],
} satisfies CheckMeta;
