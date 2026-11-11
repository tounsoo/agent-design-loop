# Proposals

A proposal is how an inventory grows. The agent writes one when the work needs something the inventories do not already record. It does not invent that piece, and it does not edit an inventory to sneak the change through.

The inventories are:

- the component catalog, `src/catalog/index.ts`
- layouts, `allowed_layouts` in `src/inputs/product.ts` and the directories in `src/layouts` — the app frame
- content layouts, `allowed_content_layouts` in `src/inputs/product.ts` and the directories in `src/content-layouts` — the compositions that fill a page type's body
- page types, `allowed_page_types` in `src/inputs/product.ts` and the directories in `src/page-types`
- flow states, `modeledStates` in `src/flows/invoice-approval/states.ts`
- rule inputs in `src/inputs/product.ts` and `src/rules/ux-rules.ts`: step budgets (`max_steps`), priority, disclosure caps, the visible-question cap, the target-size floor, and the allowed lists
- the harness config, `harness.config.ts`: where each of the inventories above lives, which the checks read. Pointing a path somewhere else can quietly empty a check

Editing a layout, content layout, or page-type implementation without changing its id is not an inventory change.

Each proposal includes:

- the rule or input it wants to change
- a reason
- a preview of the UI or the path after the change
- the graduation: which file would change on approval

`CODEOWNERS` requests review for everything under `proposals/`. Merging the proposal file records the request. It does not apply the change. After approval, a separate change graduates it into the inventory data and the checks. The next design round is more capable because that inventory grew.

Open proposals are not shipped behavior.
