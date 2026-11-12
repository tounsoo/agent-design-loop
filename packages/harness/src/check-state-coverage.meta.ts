import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Every modeled flow state has a view and a scenario.",
  fails: [
    "A string in a flow's `modeledStates` that is not a `case` label in that flow's `views` module.",
    "A flow's states file that does not export `modeledStates`, or exports an empty list.",
    "A modeled state with no scenario in the `scenarios.ts` beside its flow's states module, a scenario whose `state` is not a modeled state, an id that is not a lowercase slug with single hyphens, an id used twice across the product, and a `scenarios.ts` that is missing, does not load or does not export `scenarios` as a record of id to `{ state, ...data }`.",
  ],
  details: [
    "It matches strings, so it does not see whether the case renders anything distinct. Typecheck is a second gate for the same idea: `renderedStates` has to satisfy `ModeledState`.",
    "Scenarios are product code, not an inventory: adding or removing one needs no proposal, but a modeled state never loses its last one. It imports each `scenarios.ts` in Node, so the file holds data only, with no JSX, CSS or `window`. It needs no Chrome, so a product that opts out of a Chrome check still has its scenarios checked. It does not check that a scenario renders the state it names. [Proposal 2026-11-12-scenarios](../../../proposals/2026-11-12-scenarios.md) records the rule.",
  ],
} satisfies CheckMeta;
