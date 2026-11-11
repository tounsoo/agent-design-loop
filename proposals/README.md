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

A proposal's file name is its ID. Name a new one for the day you write it, in UTC, and a short lowercase slug: `2026-11-12-side-panel.md`. Cite it by that name, as proposal 2026-11-12-side-panel, and give it a plain title such as `# Add a side panel`. No check follows a link to a proposal, so renaming one means editing every link and citation to it by hand. Two pull requests written in parallel then pick different names without knowing about each other, where both used to reach for the next free number. Two that pick the same day and slug add the same file, which git refuses to merge when the texts differ, and `check:proposals` fails a new proposal whose name another proposal folder already holds. The proposals that merged with a number, from 0001, keep those names, because a decided or graduated proposal keeps its file name.

A proposal starts with front matter the checks read, then three sections with text under each, and a fourth, `## States`, when it changes or adds inventory members:

```md
---
status: open
changes:
  - side-panel
  - allowed_layouts
---
# Add a side panel

The rule or input it wants to change.

## Reason

Why the work needs it.

## States

- **Open:** the panel shows the record's history beside the page.
- **Closed:** the page takes the full width.
- **Empty:** the panel says the record has no history yet.
- **Loading:** Out of scope, the history is local.
- **Error:** Out of scope, the history is local.
- **Long content:** a long history scrolls inside the panel, and the page keeps its width.
- **Permissions:** Out of scope, everyone who opens the record may read its history.
- **Over time:** an entry past its due date says Overdue.

## Preview

A preview of the UI or the path after the change.

## Graduation

Which files change on approval.
```

- `status` is `open`, `decided` or `graduated`.
- `changes` lists each inventory name the proposal changes, each matched exactly: the member added or removed, the constant, the config field or its new value, each changed string in `flows`, `adapter.<field>`, the new adapter path, or a new product's directory. A name matches only as listed, so `layouts/side-panel/` does not name `side-panel`. A proposal that changes no inventory writes `changes: []`.
- `retires`, optional, lists rules the proposal takes out of `check:rules`.
- `opts-out`, optional, lists opt-outs as `<rule> for <product paths.source>`, as the next section shows.
- `adds`, optional, lists members a proposal adds in one pull request, as [Adding in one pull request](#adding-in-one-pull-request) shows. A proposal with `adds` lists nothing under `changes`, `retires` or `opts-out`, and its status is `graduated`.

`npm run check:proposals` fails a proposal the change adds or renames whose file name is not a real calendar day, no later than tomorrow in UTC, and a lowercase slug, and it fails a proposal with a missing or unknown field, a field that is not a list, `adds` beside anything under `changes`, `retires` or `opts-out` or on a proposal that is not `graduated`, a missing or empty `## Reason`, `## Preview` or `## Graduation`, or a `## States` section that misses an edge case, gives a state no text, marks one out of scope without a reason, lists only edge cases, or puts `None` beside other states. A heading inside a fenced code block or an HTML comment does not count, and a list item or value is a bare name, with no quotes or `#` comment. The check reads `proposals/`, every folder a product config names in `paths.proposals`, and any other folder named `proposals`. `CODEOWNERS` requests review for everything under `proposals/`.

### States

A proposal that lists anything under `changes` or `adds` names every state the change shows before anything is built, so a reviewer sees the edge cases when they approve it, not after the build. `## States` is a list of `- <state>: <what the screen shows>` items, with the name plain or bold:

- At least one ordinary state the change shows, such as Pending or Approved. A state that can hold at once with another, such as approved and past due, is its own item.
- Each edge case: **Empty**, **Loading**, **Error**, **Long content**, **Permissions** and **Over time**. Over time is what changes as time passes, such as a due date going by or a hold running out. Describe each, or write `Out of scope, <why>` when the change cannot reach it.
- A change that shows on no screen, such as a moved config path, writes the one item `- None: <why>` instead.

While you list them, look for information the screen would show twice, such as a new list that repeats a status row already on the page, and say in the Preview which one stays.

`npm run check:proposals` requires `## States` from a proposal the change adds, whatever status it starts at, and from one the change moves from `open` to `decided`, when it lists anything under `changes` or `adds`. A proposal already on the base keeps its text until it moves to `decided`: proposal 0001, open on main, gains its states in the pull request that approves it. A proposal already decided or graduated on the base is never asked for them, but one that has them keeps them, because they are part of what was approved. The check reads the names, not the words: any item that is not an edge case counts as an ordinary state, so whether the list is the screen's real states is the designer's to judge. A proposal that changes no member, such as a harness change or an opt-out, needs none, but any `## States` section a proposal has must read as above. [Proposal 2026-11-11-proposals-list-every-state](2026-11-11-proposals-list-every-state.md) records the rule.

### From request to graduation

A proposal moves one step at a time, each in its own pull request, unless it only adds (next section):

1. **Open.** The agent adds the file as `status: open`. Merging it records the request and applies nothing. [Proposal 0001](0001-approval-note.md) is open. Open requests are not shipped behavior.
2. **Decided.** A pull request a designer reviews moves it to `status: decided`. That is the approval. It may still edit the proposal. A proposal may also start as `decided`, when the pull request that adds it is the one the designer approves. Once it merges, what the proposal covers is fixed, and its file keeps its name.
3. **Graduated.** A later pull request makes the change and moves the proposal to `status: graduated`.

`npm run check:inventories` passes an inventory change only when it graduates a proposal: one that is `decided` on the pull request base and `graduated` in the change, and that lists what changed under `changes` as the base has them. A proposal added in the same pull request covers nothing unless it only adds (next section), an open request on the base covers nothing, and a graduating pull request cannot add a name the approval did not list. The check pins names, not values: whether `TARGET_MIN_PX` became the number the preview showed is the reviewer's to compare. `check:proposals` fails any other status move, such as `open` to `graduated` or `graduated` back to `decided`, any change to a decided or graduated proposal's `changes`, `retires`, `opts-out` or `adds`, and a decided or graduated proposal that is renamed or deleted, because its file is the record of what was approved. A new proposal may start as `graduated` only when all three are empty, because then it gates nothing: it records a harness change that `CODEOWNERS` review covers, as [proposal 0003](0003-two-step-approve.md), [proposal 0007](0007-check-gaps.md) through [proposal 0013](0013-every-route-in-the-step-budget.md) [proposal 2026-11-11-dated-proposal-names](2026-11-11-dated-proposal-names.md) and [proposal 2026-11-11-proposals-list-every-state](2026-11-11-proposals-list-every-state.md) do, or when it only adds.

### Adding in one pull request

An addition may skip the approval pull request. A change is an addition when it only adds members to the catalog exports, `allowed_layouts`, `allowed_content_layouts`, `allowed_page_types` or the flow states: every member the base had is still there. The proposal for it lists those members under `adds`, writes `changes: []`, and starts as `graduated` in the same pull request as the change:

```md
---
status: graduated
changes: []
adds:
  - side-panel
---
```

`check:inventories` lets that proposal cover only the members it lists, only in the pull request that adds it, and only when they are additions. It covers nothing when it is already on the base, when a proposal on the base already lists one of its `adds` under `adds` (a base proposal under a new file name, or a member added before that comes back), or when one of its `adds` is a name the change removes or changes in any other way. Everything else keeps two pull requests: a removal, a rename, a rule input such as `max_steps`, `priority`, `disclosed_sections` or a cap, a config path, `shells`, `flows`, the adapter, a new product, an opt-out and a retirement. A change that does both needs a proposal that only adds for the additions and a decided one for the rest.

The approval on this path is the designer's review of that one pull request, which `CODEOWNERS` requests for any folder named `proposals`. A product whose `paths.proposals` names a folder with another name needs its own `CODEOWNERS` line. The check cannot see that review. It blocks the merge only once branch protection on `main` requires code owner review; until then it is requested, not required. [Proposal 0012](0012-additions-in-one-pull-request.md) records the path and that limit.

Proposals 0001 and 0003 to 0010 were written before the fields. [Proposal 0011](0011-proposal-fields-and-graduation.md) gave them their fields, and their `Status:` lines became plain prose. A proposal's status is the one field that changes after it merges. Its text stays as it merged, with one exception: a path, proposal number or example that no longer matches the code may be corrected, with a sentence in the proposal saying so. What it decided does not change. This replaces the line in proposal 0011 that names the only edits a merged proposal takes. Proposals 0001 and 0008 were corrected that way. The files a graduated proposal's pull request changed keep the paths they had then: before [proposal 0006](0006-move-into-packages.md), Meridian lived under `src/` with its config, `index.html` and `review/` at the root, the checks under `scripts/` and the fixtures under `fixtures/`. Proposal 0006 moved them to `products/meridian/` and `packages/harness/`.

The next design round is more capable because that inventory grew.

## Opting a product out of a rule

An opt-out is a decision too, and it always takes two pull requests. A harness rule, meaning a check that `check:rules` in `package.json` runs, applies to every product. A product that should not follow one names it in its config's `optOuts`, with the path of a proposal that says why. That proposal lists each rule it turns off under `opts-out`, with the product's `paths.source`:

```md
---
status: decided
changes: []
opts-out:
  - check:disclosure for products/nook
---
```

The opt-out graduates like any other change: the proposal merges as `decided`, and the pull request that adds the entry to `optOuts` moves it to `graduated`. `npm run check:opt-outs` fails an opt-out whose proposal is missing, is not directly in the config's `paths.proposals` folder (`proposals/` unless the config names another), is not `graduated`, or has no `opts-out` entry for that rule and that product. `npm run check:retirement` fails a new opt-out whose proposal does not graduate in that pull request, or was decided without that entry. `lint:product-ui` and `check:inventories` cannot be opted out.

When a majority of products, and at least two, opt out of the same rule, `check:retirement` fails. Retire the rule, or withdraw an opt-out. A rule leaves `check:rules` only when a pull request graduates a proposal, decided on the base, that lists it under `retires`; `check:retirement` fails any other removal. It compares the rule names in `check:rules`, not what each one runs, so pointing a rule's script at other code is a harness change that `CODEOWNERS` review covers. [Proposal 0008](0008-rule-opt-out-and-retirement.md) records opt-outs and retirement, [proposal 0011](0011-proposal-fields-and-graduation.md) ties both to graduation, and [How this design loop works](../packages/harness/docs/how-it-works.md#how-a-pattern-becomes-a-rule) has the whole lifecycle.
