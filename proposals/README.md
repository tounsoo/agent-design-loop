# Proposals

A proposal is how an inventory grows. The agent writes one when the work needs something the inventories do not already record. It does not invent that piece, and it does not edit an inventory to sneak the change through.

The inventories are:

- the component catalog, `src/catalog/index.ts`
- layouts, `allowed_layouts` in `src/inputs/product.ts` and the directories in `src/layouts` — the app frame
- content layouts, `allowed_content_layouts` in `src/inputs/product.ts` and the directories in `src/content-layouts` — the compositions that fill a page type's body
- page types, `allowed_page_types` in `src/inputs/product.ts` and the directories in `src/page-types`
- flow states, `modeledStates` in `src/flows/invoice-approval/states.ts`
- rule inputs in `src/inputs/product.ts` and `src/rules/ux-rules.ts`: step budgets (`max_steps`), priority, `disclosed_sections`, disclosure caps, the visible-question cap, the target-size floor, and the allowed lists
- the harness config, `harness.config.ts`: where each of the inventories above lives, which the checks read, and its `shells` rules, which page types hold a primary slot or are collections. Pointing a path somewhere else, or dropping a page type from a rule, can quietly empty a check. A second product's config, such as `products/nook/harness.config.ts`, is an inventory of that product in the same way
- the design system adapter that config names, `adapters/todae.ts`: the component names the checks count, such as `Button.Root` and `Field.Root`. Swapping a name can empty a check the same way

Editing a layout, content layout, or page-type implementation without changing its id is not an inventory change.

Each proposal includes:

- the rule or input it wants to change
- a reason
- a preview of the UI or the path after the change
- the graduation: which file would change on approval

`CODEOWNERS` requests review for everything under `proposals/`.

A proposal is one of two kinds, and its `Status:` line says which.

- **A request**, marked `Status: open`, asks for an inventory to grow. Merging the file records the request and applies nothing. After approval, a later change graduates it into the inventory data and the checks. [Proposal 0001](0001-approval-note.md) is one, and it is still open. Open requests are not shipped behavior.
- **A decision**, marked `Status: decided`, records a change that lands with its own pull request, so nothing graduates later. Its graduation section says so and lists the files that change. [Proposal 0003](0003-two-step-approve.md), [proposal 0004](0004-config-tasks-and-previews.md) and [proposal 0005](0005-config-shells-and-web.md) are decisions.

`npm run check:inventories` cannot tell the two apart. It accepts a membership change in the same pull request as soon as that pull request adds a new proposal file containing the words reason, preview, and graduation. Keeping a request's graduation for a later change is the reviewer's call, not the check's.

The next design round is more capable because that inventory grew.
