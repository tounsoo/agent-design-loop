# Agent loop

This file is a pointer. The checks enforce the rules. Inventories are data. This file does not list what they contain. A walkthrough for people new to the repo is `packages/harness/docs/how-it-works.md`, and Meridian's own is `products/meridian/docs/how-it-works.md`.

Each product's `harness.config.ts` names where its inventories live. For **Meridian**, an accounts-payable workspace, that is `products/meridian/harness.config.ts`. Read, in order:

1. Product inputs: `products/meridian/inputs/product.ts`
2. UX rules: `products/meridian/rules/ux-rules.ts`
3. Catalog, the only UI entry: `products/meridian/catalog/index.ts`
4. Layouts: `products/meridian/layouts`
5. Content layouts: `products/meridian/content-layouts`
6. Page types: `products/meridian/page-types`
7. Flow model: `products/meridian/flows/invoice-approval`
8. Proposals: `proposals/README.md`

The named task is in the product inputs. A second product, **Nook**, lives under `products/nook/` with its own `products/nook/harness.config.ts`, which lists its inventories the same way; work on Nook reads those. The checks themselves live in `packages/harness/`; product code does not edit them.

Layouts are product-owned shells with named slots, encoded from Todae recipes. Recipes are copyable glue, not package namespaces. Do not invent component names or props. Do not fork [Todae](https://github.com/tounsoo/todae). Import UI only from the catalog.

Loop: read inventories → generate within constraints → run checks and fix → review note for leftover judgment → propose if a rule must break.

Checks: `npm run check:fixtures && npm run check`

If the work needs a catalog export, layout, content layout, page type, flow state, or rule input that is not in those inventories, open a proposal. Do not invent the missing piece, and do not edit an inventory to sneak the change through.
