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

A proposal starts with front matter the checks read, then three sections with text under each:

```md
---
status: open
changes:
  - side-panel
  - allowed_layouts
---
# Proposal 0102: Add a side panel

The rule or input it wants to change.

## Reason

Why the work needs it.

## Preview

A preview of the UI or the path after the change.

## Graduation

Which files change on approval.
```

- `status` is `open`, `decided` or `graduated`.
- `changes` lists each inventory name the proposal changes, each matched exactly: the member added or removed, the constant, the config field or its new value, each changed string in `flows`, `adapter.<field>`, the new adapter path, or a new product's directory. A name matches only as listed, so `layouts/side-panel/` does not name `side-panel`. A proposal that changes no inventory writes `changes: []`.
- `retires`, optional, lists rules the proposal takes out of `check:rules`.
- `opts-out`, optional, lists opt-outs as `<rule> for <product paths.source>`, as the next section shows.

`npm run check:proposals` fails a proposal with a missing or unknown field, a field that is not a list, or a missing or empty `## Reason`, `## Preview` or `## Graduation`. A heading inside a fenced code block or an HTML comment does not count, and a list item or value is a bare name, with no quotes or `#` comment. The check reads `proposals/`, every folder a product config names in `paths.proposals`, and any other folder named `proposals`. `CODEOWNERS` requests review for everything under `proposals/`.

### From request to graduation

A proposal moves one step at a time, each in its own pull request:

1. **Open.** The agent adds the file as `status: open`. Merging it records the request and applies nothing. [Proposal 0001](0001-approval-note.md) is open. Open requests are not shipped behavior.
2. **Decided.** A pull request a designer reviews moves it to `status: decided`. That is the approval. It may still edit the proposal. A proposal may also start as `decided`, when the pull request that adds it is the one the designer approves. Once it merges, what the proposal covers is fixed, and its file keeps its name.
3. **Graduated.** A later pull request makes the change and moves the proposal to `status: graduated`.

`npm run check:inventories` passes an inventory change only when it graduates a proposal: one that is `decided` on the pull request base and `graduated` in the change, and that lists what changed under `changes` as the base has them. A proposal added in the same pull request covers nothing, an open request on the base covers nothing, and a graduating pull request cannot add a name the approval did not list. The check pins names, not values: whether `TARGET_MIN_PX` became the number the preview showed is the reviewer's to compare. `check:proposals` fails any other status move, such as `open` to `graduated` or `graduated` back to `decided`, any change to a decided proposal's `changes`, `retires` or `opts-out`, and a decided or graduated proposal that is renamed or deleted, because its file is the record of what was approved. A new proposal may start as `graduated` only when all three are empty, because then it gates nothing: it records a harness change that `CODEOWNERS` review covers, as [proposal 0003](0003-two-step-approve.md) and [proposal 0007](0007-check-gaps.md) through [proposal 0010](0010-proposal-fields-and-graduation.md) do.

Proposals 0001 and 0003 to 0009 were written before the fields. [Proposal 0010](0010-proposal-fields-and-graduation.md) gave them their fields, and their `Status:` lines became plain prose. A proposal's status is the one field that changes after it merges.

The next design round is more capable because that inventory grew.

## Opting a product out of a rule

An opt-out is a decision too. A harness rule, meaning a check that `check:rules` in `package.json` runs, applies to every product. A product that should not follow one names it in its config's `optOuts`, with the path of a proposal that says why. That proposal lists each rule it turns off under `opts-out`, with the product's `paths.source`:

```md
---
status: decided
changes: []
opts-out:
  - check:disclosure for products/nook
---
```

The opt-out graduates like any other change: the proposal merges as `decided`, and the pull request that adds the entry to `optOuts` moves it to `graduated`. `npm run check:opt-outs` fails an opt-out whose proposal is missing, is not directly in the config's `paths.proposals` folder (`proposals/` unless the config names another), is not `graduated`, or has no `opts-out` entry for that rule and that product. `npm run check:retirement` fails a new opt-out whose proposal does not graduate in that pull request, or was decided without that entry. `lint:product-ui` and `check:inventories` cannot be opted out.

When a majority of products, and at least two, opt out of the same rule, `check:retirement` fails. Retire the rule, or withdraw an opt-out. A rule leaves `check:rules` only when a pull request graduates a proposal, decided on the base, that lists it under `retires`; `check:retirement` fails any other removal. It compares the rule names in `check:rules`, not what each one runs, so pointing a rule's script at other code is a harness change that `CODEOWNERS` review covers. [Proposal 0008](0008-rule-opt-out-and-retirement.md) records opt-outs and retirement, [proposal 0010](0010-proposal-fields-and-graduation.md) ties both to graduation, and [How this design loop works](../packages/harness/docs/how-it-works.md#how-a-pattern-becomes-a-rule) has the whole lifecycle.
