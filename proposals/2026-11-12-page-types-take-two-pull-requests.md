---
status: adopted
changes: []
---
# A new page type takes two pull requests

Decided by Ben, and adopted with its own pull request. Ben asked on Nov 12, 2026 that a page type missing from both `shells` rules fail, after the review of pull request 42 read the harness as letting a page type land in one pull request with no `shells` entry. That gap was not there: since [proposal 0005](0005-config-shells-and-web.md), `check:inventories`, `lint:slots` and `check:one-thing` fail an allowed page type that neither `shells.primarySlots` nor `shells.collections` names. What was wrong was the record. [Proposal 0012](0012-additions-in-one-pull-request.md) listed `allowed_page_types` among the lists that grow in one pull request, and the checks never let a page type through that way. This makes the record and the messages match the checks. It changes the harness's own messages, not an inventory, so it lists no changes and is adopted at once.

Rule or input: what `check:inventories` counts as an addition, and two failure messages. No product input, rule cap, catalog export, layout, content layout, page type, flow state, adapter field or product config changes. `check:rules` does not change, and no check passes or fails a change it did not before.

- **The lists that grow in one pull request.** The catalog exports, `allowed_layouts`, `allowed_content_layouts` and the flow states. `allowed_page_types` is not one, because a new page type needs an entry under `shells` as well, and `shells` is config, which [proposal 0012](0012-additions-in-one-pull-request.md) already counted as no addition.
- **The path for a page type.** One proposal, decided on the base in its own pull request, lists the page type and the `shells` rule it joins, `shells.primarySlots` or `shells.collections`, under `changes`. A second pull request adds the page type, its shell and its `shells` entry, and marks the proposal `adopted`.
- **The messages.** A page type in neither `shells` rule now says how to fix it. A change that adds a page type says it is never added in one pull request, in place of offering a proposal that lists it under `adds`, which could never pass.

## Reason

A page type decides which rules read a page: `shells.primarySlots` holds a detail-style page to one primary action, and `shells.collections` holds a collection's body to a registered content layout and keeps primary actions off it. Which of those a new page type follows is a design decision, so it belongs on the approval pull request with the page type, not after it. The checks already worked this way. The docs and the `check:inventories` message offered a one-pull-request path that always failed, and an agent that followed them would write a proposal the check refuses.

The cost is the second pull request for every new page type. A page type is rare next to a new export or layout, and the review is the point: it is the one inventory change that also changes which rules apply.

## Preview

`check:inventories` on a pull request that adds `board` to `allowed_page_types`, names it under `shells.collections`, and adds a proposal that lists `board` under `adds`:

```
inventory: allowed_page_types changed from ["collection","detail"] to ["board","collection","detail"]. No adopted proposal covers it: a decided proposal must list "board" under changes. A page type is never added in one pull request: it also needs an entry under shells in products/meridian/harness.config.ts, so one proposal decided on the base lists the page type and the shells rule it joins, shells.primarySlots or shells.collections, under changes.
```

The same page type with no `shells` entry, from `check:inventories`, `lint:slots` and `check:one-thing`:

```
products/meridian/harness.config.ts shells names page type "board" in neither primarySlots nor collections, so no shell rule reads its pages. Add it to shells.primarySlots with the slot that holds its one primary action, or to shells.collections with its chrome slots. That is a config change, so a proposal decided on the base lists the page type and that shells rule under changes, and a new page type takes two pull requests.
```

## Adoption

`packages/harness/src/check-inventories.ts` drops `allowed_page_types` from the lists that may grow in one pull request and adds the page-type line to its message. `packages/harness/src/lib/shells.ts` says how to fix a page type in neither rule. New fixture: `illegal/adds-a-page-type` fails. `illegal/unclassified-page-type` still fails with the same phrase. `CLAUDE.md`, `AGENTS.md`, the verify skill, `proposals/README.md`, proposal 0012, the harness README and `how-it-works.md` say a page type takes two pull requests.
