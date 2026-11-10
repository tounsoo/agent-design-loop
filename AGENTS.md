# Agent loop

This file is a pointer. The checks enforce the rules. Inventories are data. This file does not list what they contain.

Read, in order:

1. Product inputs: `src/inputs/product.ts`
2. UX rules: `src/rules/ux-rules.ts`
3. Catalog, the only UI entry: `src/catalog/index.ts`
4. Layouts: `src/layouts`
5. Content layouts: `src/content-layouts`
6. Page types: `src/page-types`
7. Flow model: `src/flows/invoice-approval`
8. Proposals: `proposals/README.md`

The product is **Meridian**, an accounts-payable workspace. The named task is in the product inputs.

Layouts are product-owned shells with named slots, encoded from Todae recipes. Recipes are copyable glue, not package namespaces. Do not invent component names or props. Do not fork [Todae](https://github.com/tounsoo/todae). Import UI only from the catalog.

Loop: read inventories → generate within constraints → run checks and fix → review note for leftover judgment → propose if a rule must break.

Checks: `npm run check:fixtures && npm run check`

If the work needs a catalog export, layout, content layout, page type, flow state, or rule input that is not in those inventories, open a proposal. Do not invent the missing piece, and do not edit an inventory to sneak the change through.
