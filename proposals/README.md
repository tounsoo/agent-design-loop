# Proposals

A proposal is how an inventory grows. The agent writes one when the work needs something the inventories do not already record. It does not invent that piece, and it does not edit an inventory to sneak the change through.

The inventories are listed here with Meridian's paths, under `products/meridian/`:

- the component catalog, `catalog/index.ts`
- layouts, `allowed_layouts` in `inputs/product.ts` and the directories in `layouts` — the app frame
- content layouts, `allowed_content_layouts` in `inputs/product.ts` and the directories in `content-layouts` — the compositions that fill a page type's body
- page types, `allowed_page_types` in `inputs/product.ts` and the directories in `page-types`
- flow states, `modeledStates` in `flows/invoice-approval/states.ts`
- rule inputs in `inputs/product.ts` and `rules/ux-rules.ts`: step budgets (`max_steps`), priority, `disclosed_sections`, disclosure caps, the visible-question cap, the target-size floor, and the allowed lists
- the harness config, `harness.config.ts`: where each of the inventories above lives, which the checks read, and its `shells` rules, which page types hold a primary slot or are collections. Pointing a path somewhere else, or dropping a page type from a rule, can quietly empty a check. Every product's config, such as `products/nook/harness.config.ts`, is an inventory of that product in the same way
- the design system adapter that config names, `packages/adapter-todae/index.ts`: the component names the checks count, such as `Button.Root` and `Field.Root`. Swapping a name can empty a check the same way

Editing a layout, content layout, or page-type implementation without changing its id is not an inventory change.

Each proposal includes:

- the rule or input it wants to change
- a reason
- a preview of the UI or the path after the change
- the graduation: which file would change on approval

`CODEOWNERS` requests review for everything under `proposals/`.

A proposal is one of two kinds, and its `Status:` line says which.

- **A request**, marked `Status: open`, asks for an inventory to grow. Merging the file records the request and applies nothing. After approval, a later change graduates it into the inventory data and the checks. [Proposal 0001](0001-approval-note.md) is one, and it is still open. Open requests are not shipped behavior.
- **A decision**, marked `Status: decided`, records a change that lands with its own pull request, so nothing graduates later. Its graduation section says so and lists the files that change. [Proposal 0003](0003-two-step-approve.md), [proposal 0004](0004-config-tasks-and-previews.md), [proposal 0005](0005-config-shells-and-web.md), [proposal 0006](0006-move-into-packages.md), [proposal 0007](0007-check-gaps.md), [proposal 0008](0008-rule-opt-out-and-retirement.md), [proposal 0009](0009-design-loop-graph.md) and [proposal 0010](0010-loop-trace.md) are decisions.

`npm run check:inventories` cannot tell the two apart. It accepts a membership change in the same pull request as soon as that pull request adds a new proposal file containing the words reason, preview, and graduation that also names what changed: the member added or removed, the constant, the config field, or the new product's directory. A proposal that names a different change does not let this one through. Keeping a request's graduation for a later change is the reviewer's call, not the check's.

The next design round is more capable because that inventory grew.

## Opting a product out of a rule

An opt-out is a decision too. A harness rule, meaning a check that `check:rules` in `package.json` runs, applies to every product. A product that should not follow one names it in its config's `optOuts`, with the path of a decided proposal that says why. Besides the reason, preview and graduation, that proposal has one line per rule it turns off, naming the rule and the product's `paths.source`:

```md
Status: decided.

Opts out: `check:disclosure` for `products/nook`
```

`npm run check:opt-outs` fails an opt-out whose proposal is missing, is not directly in the config's `paths.proposals` folder (`proposals/` unless the config names another), is not decided, or has no such line for that rule and that product. A line inside a fenced code block, like the one above, or inside an HTML comment, is an example and does not count. Only the first `Status:` line counts. `lint:product-ui` and `check:inventories` cannot be opted out. When a majority of products, and at least two, opt out of the same rule, `npm run check:retirement` fails. Retire the rule with a decided proposal that takes it out of `check:rules`, or withdraw an opt-out. [Proposal 0008](0008-rule-opt-out-and-retirement.md) records both, and [How this design loop works](../packages/harness/docs/how-it-works.md#how-a-pattern-becomes-a-rule) has the whole lifecycle.
