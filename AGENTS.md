# Agent loop

This file is a pointer. The checks enforce the rules.

Read, in order:

1. Product inputs: `src/inputs/product.ts`
2. UX rules: `src/rules/ux-rules.ts`
3. Catalog, the only UI entry: `src/catalog/index.ts`
4. Page types: `src/page-types/settings`
5. Flow model: `src/flows/notification-prefs`
6. Proposals: `proposals/README.md`

Loop: read inputs → generate within constraints → run checks and fix → review note for leftover judgment → propose if a rule must break.

Checks: `npm run check:fixtures && npm run check`

Do not raise `max_steps`, add a page type, or import UI from anywhere but the catalog. Open a proposal instead.
