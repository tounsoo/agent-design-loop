import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Runs `check:product` on every product the registry finds, one after another, so a new product needs no script or CI job of its own.",
  flags: [{ name: "--json", what: "Prints the product configs as a JSON array and runs nothing. CI reads it to give each product its own job." }],
  fails: [
    "Any product whose `check:product` run fails. It runs the rest first, then names every product that failed.",
    "No product: no `harness.config.ts` outside the harness package.",
    "An argument other than `--json`.",
  ],
  details: [
    "A product is any `harness.config.ts` git knows of, tracked or new and not ignored, outside `packages/harness/` (`lib/products.ts`), and still in the working tree. Nothing lists products by hand: `check:proposals`, `check:retirement`, `check:trace` and CI read the same registry.",
  ],
} satisfies CheckMeta;
