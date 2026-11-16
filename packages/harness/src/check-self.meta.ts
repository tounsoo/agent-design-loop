import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "The rule table, weeds log and suppressions match the self-correcting standard, and the trust measures are printed.",
  fails: [
    "A rule table with no tier, the wrong columns, a row with no evidence, an enforcer that does not resolve, or a status that disagrees with the enforcer.",
    "A weeds log whose header or a row is not the date, class, ref, caught_by and note the standard defines.",
    "A suppression count above `.agents/suppression-baseline.json`, or an annotated suppression with no reason, an expiry already past, or an expiry more than 90 days out.",
    "A tier of T1 while an enforced class has a weeds row dated in the last 30 days.",
  ],
  details: [
    "The columns, the log and the suppression form are home's standards/self-correcting.md. This script checks that shape. It does not copy the standard into the repository.",
    "It prints the machine-caught share, the repeats in the last 30 days, the suppression counts against the baseline, the text rows, and the classes seen twice with no enforced rule.",
    "It takes no --config. The Vitest suite in packages/harness/src/lib/self-correcting.test.ts proves it on bad inputs, because it reads this repository rather than a product config.",
  ],
} satisfies CheckMeta;
