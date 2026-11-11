---
status: graduated
changes: []
---
# Proposal 0012: An inventory addition graduates in one pull request

Decided by Ben, and graduated with its own pull request. [Proposal 0011](0011-proposal-fields-and-graduation.md) made every gated change take two pull requests: one that a designer reviews to move the proposal to `decided`, and a later one that makes the change and marks it `graduated`. Ben asked that adding to an inventory take one pull request, while opt-outs and retirements keep two. This records how that reads now. It changes the harness's own checks, not an inventory, so it lists no changes and graduates at once.

Rule or input: a new optional proposal field, `adds`, read by `check:proposals` and `check:inventories`, and a router in the design loop graph. No product input, rule cap, catalog export, layout, content layout, page type, flow state, adapter field or product config changes. `check:rules` does not change.

- **What counts as an addition.** A change that only adds members to one of five lists: the catalog exports, `allowed_layouts`, `allowed_content_layouts`, `allowed_page_types` or the flow states. Every member the base had is still there, and nothing else in that list moved. A removal, a rename (one member out, one in), a rule input such as `max_steps`, `priority`, `disclosed_sections` or a cap, a config path, `shells`, `flows`, the adapter, a new product, an opt-out and a retirement are not additions. Each still graduates a proposal decided on the base, in a later pull request.
- **A proposal that only adds.** It lists the new members under `adds`, writes `changes: []`, lists nothing under `retires` or `opts-out`, and starts as `status: graduated`, in the pull request that makes the addition. `check:proposals` fails `adds` beside anything under `changes`, `retires` or `opts-out`, and `adds` on a proposal that is `open` or `decided`. Once merged, its `adds` are pinned like any other list.
- **What it covers.** `check:inventories` lets such a proposal cover a change only when the proposal is new in that pull request and the change is all additions, member by member. A proposal already on the base covers nothing, so it cannot let a later addition through. A proposal whose `adds` name anything this change removes or changes in any other way covers nothing at all, not even the members it does add. A mixed change still needs a decided proposal for every part that is not an addition.
- **The loop.** The design loop graph gets a router after `propose`: "Does the proposal only add members to an inventory list?" On `only adds`, the run graduates the proposal and builds in the same pull request. On `anything else`, it opens the proposal's pull request and waits for approval, as before.
- **Review.** `CODEOWNERS` gains `proposals/` beside `/proposals/`, so review is requested for a proposal in any folder named `proposals`, wherever a product's `paths.proposals` puts it.

## Reason

An addition is the common case and the cheap one to undo: a new export or layout that nothing uses yet, or that a later pull request removes. Two pull requests for it doubled the review for the change that most often grows the product. Removals, renames, rule inputs, opt-outs and retirements change what already ships or loosen a rule, so they keep the approval on record before they land.

The cost is the separate approval. On the two-pull-request path, `check:inventories` can see that a reviewed pull request moved the proposal to `decided` before the change landed. On the one-pull-request path, the agent writes the proposal and the change together, and nothing the check reads shows that a designer looked. The only gate is the designer's review of that pull request, which `CODEOWNERS` requests because it touches `proposals/`. That review blocks the merge only once branch protection on `main` requires code owner review, which is Ben's setting in GitHub. Until then it is requested, not required, so the one-pull-request path is only as safe as that setting.

## Preview

`check:inventories` on a pull request that adds `side-panel` to `allowed_layouts` with a new proposal that lists it under `adds`:

```
inventory: allowed_layouts changed from ["app-shell"] to ["app-shell","side-panel"]. Graduates proposals/0102-side-panel.md (only adds, so it graduates in the pull request that adds it, which a designer reviews).
```

The same proposal on a pull request that removes `side-panel`:

```
inventory: allowed_layouts changed from ["app-shell","side-panel"] to ["app-shell"]. No graduating proposal covers it: a decided proposal must list "side-panel" under changes.
inventory:   proposals/0102-side-panel.md lists "side-panel" under adds, which this change removes or changes rather than adds, so it covers nothing.
```

`check:proposals` on a proposal that lists `adds` and `changes` together:

```
- proposals/0102-side-panel.md lists adds alongside changes. A proposal that adds in one pull request lists nothing else: put the rest in its own proposal, decided before it graduates.
```

## Graduation

`packages/harness/src/lib/proposals.ts` reads `adds` and refuses it mixed or unless graduated, and `addingInThisChange` returns the proposals a change adds that only add. `packages/harness/src/check-inventories.ts` marks a change to one of the five lists as additions when nothing left the list, and lets a proposal that only adds cover those members. `packages/harness/design-loop.ts` gets the `scope` router, and the diagram in `packages/harness/docs/how-it-works.md` is redrawn. New fixtures: `adds-in-one-pull-request` passes; `illegal/adds-a-removal`, `illegal/adds-alongside-a-rule-change`, `illegal/adds-with-changes` and `illegal/adds-graduated-before` fail. Vitest covers parsing, pinning and the trace. `CODEOWNERS`, `CLAUDE.md`, `AGENTS.md`, the verify skill, `proposals/README.md` and the harness docs describe both paths.
