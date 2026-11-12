import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Runs `check:opt-outs`, then every rule check in `check:rules`, on one product, skipping a rule the product opts out of.",
  flags: [{ name: "--config", value: "<file>", what: "Required, and the only flag: the product's `harness.config.ts`, passed to every check it runs." }],
  fails: ["No `--config <file>`, or any other argument beside it.", "The first check that fails on that product. It stops there.", "An app in `paths.web` that does not build or serve, when a check that opens it is next."],
  details: [
    "It reads the rule checks from `check:rules` in `package.json`, in its order, so the two cannot drift, and says which rules it skips. Typecheck, ESLint and the Vitest suite read the whole repository, so `npm run check` runs them once and `check:products` runs this once per product.",
    "The checks that open the app in Chrome, `check:target-size` and `check:accessible-names`, share one build of it: just before the first of them it builds `paths.web` and serves it with `vite preview` on a free port, then hands each the address. Run on its own, either check builds and serves its own copy the same way.",
  ],
} satisfies CheckMeta;
