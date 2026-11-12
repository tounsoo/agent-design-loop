import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Runs `check:opt-outs`, then every rule check in `check:rules`, on one product, skipping a rule the product opts out of.",
  flags: [{ name: "--config", value: "<file>", what: "Required, and the only flag: the product's `harness.config.ts`, passed to every check it runs." }],
  fails: ["The first check that fails on that product. It stops there."],
  details: [
    "It reads the rule checks from `check:rules` in `package.json`, in its order, so the two cannot drift, and says which rules it skips. Typecheck, ESLint and the Vitest suite read the whole repository, so `npm run check` runs them once and this once per product.",
  ],
} satisfies CheckMeta;
