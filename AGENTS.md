# Agent loop

This file is a pointer. The checks enforce the rules.

Read, in order:

1. Product inputs: `src/inputs/product.ts`
2. UX rules: `src/rules/ux-rules.ts`
3. Catalog, the only UI entry: `src/catalog/index.ts`
4. App shell: `src/layouts/app-shell`
5. Page types: `src/page-types/collection` and `src/page-types/detail`
6. Flow model: `src/flows/invoice-approval`
7. Proposals: `proposals/README.md`

The product is **Meridian**, an accounts-payable workspace. The app shell is the frame. The page types are still only `collection` and `detail`. The named task is `approve-vendor-invoice`.

Layouts are product-owned shells with named slots, encoded from Todae recipes. Recipes are copyable glue, not package namespaces. There is no `AppShell.*`, `DataTable.*`, or `FilterBar.*` export. Do not invent component names or props. Do not fork [Todae](https://github.com/tounsoo/todae).

- App shell: https://todae.omsoo.design/recipes/app-shell
- Data table: https://todae.omsoo.design/recipes/data-table
- Filter bar: https://todae.omsoo.design/recipes/filter-bar

Loop: read inputs → generate within constraints → run checks and fix → review note for leftover judgment → propose if a rule must break.

Checks: `npm run check:fixtures && npm run check`

Do not raise `max_steps`, add a page type, or import UI from anywhere but the catalog. Open a proposal instead.
