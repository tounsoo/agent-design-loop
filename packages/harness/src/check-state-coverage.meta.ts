import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Every modeled flow state has a view.",
  fails: [
    "A string in a flow's `modeledStates` that is not a `case` label in that flow's `views` module.",
    "A flow's states file that does not export `modeledStates`, or exports an empty list.",
  ],
  details: [
    "It matches strings, so it does not see whether the case renders anything distinct. Typecheck is a second gate for the same idea: `renderedStates` has to satisfy `ModeledState`.",
  ],
} satisfies CheckMeta;
