import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Starts a product: copies the harness's fixture product, which passes every check, to `products/<name>/` and points its config there.",
  tool: true,
  details: [
    "Run it as `npm run new:product -- <name>`, with a lowercase slug. It refuses a folder that already exists. The registry finds the new product from its config, so `npm run check` and CI check it with nothing else to edit. A new product is a whole inventory added at once, so `check:inventories` passes it only with an adopted proposal that lists `products/<name>` under `changes`, decided on the base. The copy is the fixture's invoice approval: rename and reshape it from there, one proposal at a time.",
  ],
} satisfies CheckMeta;
