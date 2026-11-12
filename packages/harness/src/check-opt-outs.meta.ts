import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Every opt-out in a product's config stands on an adopted proposal that names the rule and the product.",
  fails: [
    "An entry in the config's `optOuts` that names a rule `check:rules` does not run, or a core rule, `lint:product-ui` or `check:inventories`.",
    "An opt-out whose proposal is missing, is not directly in `paths.proposals` (`proposals/` by default), is not `status: adopted`, or has no `opts-out` entry naming the rule and the product's `paths.source`, as `<rule> for <paths.source>`.",
  ],
  details: [
    "`check:product` runs it before any rule check, so a rule is skipped only on an opt-out that passed here. [Proposal 0008](../../../proposals/0008-rule-opt-out-and-retirement.md) and [proposal 0011](../../../proposals/0011-proposal-fields-and-graduation.md) have the rules.",
  ],
} satisfies CheckMeta;
