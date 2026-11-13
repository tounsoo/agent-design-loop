import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Starts a product: copies the harness's fixture product, which passes every check, to `products/<name>/` and points its config there.",
  tool: true,
  details: [
    "Run it as `npm run new:product -- <name>`, with a lowercase slug. It refuses a folder that already exists. The registry finds the new product from its config, so `npm run check` and CI run every rule check on it with nothing else to edit. `check:docs` then fails until the product has its folder in the verify map, `.claude/skills/verify/features/<name>/`, with a feature file covering each of its page types, layouts, content layouts, tasks and scenarios, and `npm run docs:gen` has listed it. A new product is a whole inventory added at once, so `check:inventories` passes it only with an adopted proposal that lists `products/<name>` under `changes`, decided on the base. The copy is the fixture's invoice approval: rename and reshape it from there, one proposal at a time.",
  ],
} satisfies CheckMeta;
