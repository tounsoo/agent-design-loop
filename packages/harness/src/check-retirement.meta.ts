import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "A rule most products opt out of is flagged for retirement, and a rule leaves `check:rules`, or a product opts out, only by adopting a proposal.",
  fails: [
    "Two configs that name the same `paths.source`.",
    "Any product's opt-outs that fail the rules of `check:opt-outs`, so a product no `check:<name>` script runs cannot carry one either.",
    "A rule a majority of products, and at least two, opt out of. With two products, both must.",
    "Compared with the base: a rule that leaves `check:rules` unless an adopted proposal lists it under `retires`, and a new opt-out unless its proposal is adopted in the change and listed it under `opts-out` when it was decided.",
  ],
  details: [
    "A product is any `harness.config.ts` git knows of, tracked or new, outside the harness package, whose fixtures are not products. A tracked config deleted from the working tree is no longer a product. A rule is identified by its script name. [Proposal 0008](../../../proposals/0008-rule-opt-out-and-retirement.md) has the rule, and `packages/harness/src/lib/opt-outs.test.ts` tests the threshold.",
  ],
} satisfies CheckMeta;
