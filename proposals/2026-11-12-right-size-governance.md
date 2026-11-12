---
status: decided
changes: []
---
# One pull request for changes that grow a product or tighten a rule

Ben asked on Nov 12, 2026 for the harness plan from that day's deep eval to be carried out in order. The eval and its plan are notes outside the repository; this is the plan's item 6, "Right-size governance", part 1.

Today every gated change but an addition to four lists takes two pull requests. That is sized for the riskiest change and applied to the cheapest. This proposal sorts changes by what they do to the rules. A change that loosens or removes a rule keeps two pull requests. A change that only grows a product or tightens a rule takes one.

It reverses part of [proposal 0012](0012-additions-in-one-pull-request.md), which named rule inputs, `shells` and `flows` as never additions, and part of [proposal 2026-11-12-page-types-take-two-pull-requests](2026-11-12-page-types-take-two-pull-requests.md). Both are adopted. It also loosens governance itself, so by its own rule it lands in two pull requests. This one records the decision and changes nothing any check enforces. A later pull request, part 2, makes the change and marks this proposal `adopted`. It changes the harness's own rules, not an inventory, so it lists no changes.

Rule or input: what `check:inventories` lets one pull request change, a new proposal field, the page-CSS rule inside `check:inventories`, and the labels of the loop's `scope` router and human gate. No product data changes: no product input, rule cap, catalog export, layout, content layout, page type, flow state, adapter field or product config. `check:rules` does not change.

- **The test.** A change takes two pull requests when, after it, the harness lets through something it refused before, or checks less than it did: a rule removed or turned off, a cap or budget loosened, coverage dropped, or a config path or adapter field changed, since either can empty a check. A change that only grows what a product has, or only makes a rule stricter, takes one pull request, with a proposal in that pull request that names what it adds or tightens. Removals and renames keep two pull requests even when they narrow a list (last bullet but two).
- **One pull request, under `adds`.** The four lists that grow in one pull request today (catalog exports, `allowed_layouts`, `allowed_content_layouts` and flow states), plus three more. `adds` names each new member so that names from different lists cannot collide: a page type by its id, as layouts are named today, and the other two with a prefix.
  - **A new page type with its shell.** The page type in `allowed_page_types`, its directory under `page-types/`, and one new `shells` entry for that page type alone, under `shells.primarySlots` or `shells.collections`. `adds` lists the page type. The check accepts the `shells` change only when every entry the base had is unchanged and the one new key is that page type, and a new `collections` entry must leave its pages at least one body slot. Its pass line prints the rule the page type joins and its slots, such as `board joins shells.collections: chrome Heading, Description`, so Ben reads that choice in the pull request he merges.
  - **A new task.** A new entry in the product's `tasks`, with its `success_state` and `max_steps`, and its graph module under `flows[].tasks`. `adds` lists `task:<id>`. A new task adds a step budget, so the harness checks more than before.
  - **A new preview.** A new query under a state in `flows[].previews`, with every (state, query) pair the base had still there. `adds` lists `preview:<state>?<query>`, such as `preview:ready?page=detail&room=quarry`. The same query under another state is a new pair. Moving a query from one state to another drops a pair, so it takes two pull requests.
- **One pull request, under a new field, `tightens`.** A rule input whose new value is stricter than the base's, compared item by item. `tightens` lists each input it tightens, per task where the input is per task:
  - `max_steps:<task id>`: that task's budget, lowered, with its `success_state` unchanged.
  - `MAX_DISCLOSURE_DEPTH`, `MAX_DISCLOSURES_PER_PAGE` or `MAX_VISIBLE_QUESTIONS`, lowered.
  - `TARGET_MIN_PX`, raised.
  - `disclosed_sections:<section>`: a section added, with every section the base had still there. Each listed section must sit behind a disclosure, so a longer list is stricter.
  - If plan item 1's heading rule, which is not on `main` yet, takes a rule input, a larger step between the page title and a section heading.

  A proposal may list `adds` and `tightens` together. With either, it lists nothing under `changes`, `retires` or `opts-out`, starts as `adopted`, and covers nothing once it is on the base. A change in which any item moved the other way, such as one task's budget lowered and another's raised, is not a tightening, and a `tightens` proposal covers none of it. The rule that refuses an `adds` name a base proposal already lists does not apply to `tightens`: the same input can be tightened again later, each time against its own base. `## States` stays required when `adds` lists anything. A proposal that only tightens shows no new state, so it needs none.
- **Two pull requests, as today.**
  - A removal or rename of any member, including a task, a preview pair and a `disclosed_sections` entry.
  - A loosened rule input, the opposite direction of each line above.
  - A task's `success_state` changed.
  - `priority`.
  - A config path.
  - A change to a `shells` entry the base had.
  - Any other change to `flows`.
  - The adapter.
  - A new product.
  - An opt-out and a retirement, which `check:opt-outs` and `check:retirement` keep enforcing.
  - A change to harness code that removes a check or makes one accept more. Harness code is not an inventory, so no check can see whether a change to it loosens. For those, the decided proposal is the record, and Ben's merge is the gate.
- **The page-CSS rule outside a collection's body leaves.** This is a removal of a check, so this decided proposal is its first pull request, and part 2 removes it. Today `check:inventories` reads every feature file and fails a class that the product's stylesheet styles and no layout, content layout or page type uses, with the message "is not a registered content layout", on every page, not only on a collection. Classes used in a page type's own shell are exempt. After part 2, a feature file's class needs no proposal. The other class rule stays: on a collection page, a class on any element outside the shell's chrome slots fails, because a collection's body is composed of content layouts. Classes in chrome slots go unchecked, as they do today. What a class does on any other page is a look question for the rendered-page check (plan item 1) and the critique step (plan item 2), which see the page; the rule could only see a class name. Part 2 removes this rule only once plan item 1 is on `main`. If it is not, part 2 lands everything else and leaves this rule in place.
- **Scenarios.** Plan item 4 would move rendered cases into a product-owned `scenarios.ts`, which does not exist yet. If it lands, a scenario is product code, not an inventory, and adding one needs no proposal. Until then, previews follow the `adds` line above.
- **The human gate, named for what it is.** The loop's `approval` node says "A designer reviews the proposal's pull request", and `lib/loop.ts`, `opt-outs.ts`, the docs and the pass lines call that review the approval. In this repository the code owner is Ben, and every pull request is opened from his account. `CODEOWNERS` already says GitHub requests review only on a pull request someone else opens, so it is never requested here. Branch protection that required it would leave every pull request waiting on an admin bypass. What actually approves is Ben's merge. The node becomes "The code owner merges the proposal's pull request", with `approver: "code owner"`, and the docs say that in this repository that is Ben. A product team with a second owner can still turn on branch protection that requires code owner review. That is the stronger gate, and the setting is the owner's.
- **The `scope` router.** Its question becomes whether the proposal only adds or tightens. Its edges keep their `when` labels, `only adds` and `anything else`, so the traces already on `main` stay walks of the graph.
- **Not changed: `check:retirement`'s majority rule.** The eval suggested freezing it until a third product exists. It stays. With two products it fails only when both opt out of the same rule, which is exactly when a rule is not shared. Neither product has an opt-out, so it costs no pull request today, and freezing it would keep its code and lose that signal.
- **Not changed: task graph files.** `check:step-budget` reads each task's graph module, and `check:inventories` compares only the module's path. Editing an existing graph can shorten its modeled path with no proposal, today and after this change. That gap is noted here, not closed.

## Reason

The eval found the ceremony sized for the riskiest change and applied to the cheapest. Showing one more room in a preview, adding a page type with its shell, or lowering a step budget each take two pull requests. The approval the second pull request waits for is a `status: decided` line an agent writes, merged by the same person who merges the change. Agents bent designs to avoid it: pull request 49, a detail page, deleted a class that the page-CSS rule refused with a message about content layouts, though no collection was involved.

Two pull requests earn their cost when a change loosens. The decision then lands on `main` before anything relies on it, and a reviewer reads the rule change without a page beside it that wants the rule looser. The same person merges both pull requests, so the gain is that order, not a second reviewer. When a change only adds or tightens, the harness checks at least as much after it as before, so the separate approval adds a wait and no protection. Ben's merge reads both the proposal and the change in that one pull request.

The cost is real.

- A page type's `shells` entry decides which rules read its pages, and it is now approved in the same pull request as the page that wants it. That is the risk proposal 2026-11-12-page-types-take-two-pull-requests named. It is bounded: only a brand-new page type's own entry rides along, a collection entry must leave a body slot, the pass line prints the rule and slots, and moving an existing page type between rules keeps two pull requests.
- Dropping the page-CSS rule outside collections loses a guard against ad-hoc layout on other pages, including a new page type's pages. That is why part 2 drops it only after the rendered-page check is on `main`.

Removals and renames keep two pull requests, though removing a catalog export narrows what agents may use. Removing a flow state, a task or a preview drops coverage, and telling the narrowing removals from the loosening ones, list by list, costs more than the second pull request saves on a rare change.

## Preview

After part 2, `check:inventories` on a pull request that adds `board` to `allowed_page_types` and `board: ["Heading", "Description"]` under `shells.collections`, with a proposal that lists `board` under `adds`. It prints one line for the list and one for the config:

```
inventory: allowed_page_types changed from ["collection","detail"] to ["board","collection","detail"]. Adopts proposals/2026-11-20-board.md (only adds or tightens, so it is adopted in the pull request that adds it, which the code owner merges).
inventory: products/meridian/harness.config.ts shells adds board, the page type this change adds: board joins shells.collections: chrome Heading, Description. Adopts proposals/2026-11-20-board.md.
```

The same pull request moving `collection` from `shells.collections` to `shells.primarySlots` as well:

```
inventory: products/meridian/harness.config.ts shells changed an entry the base had ("collection"). No adopted proposal covers it: a decided proposal must list "shells.collections" and "shells.primarySlots" under changes.
```

A proposal that lists `max_steps:approve-vendor-invoice` under `tightens`, on a pull request that raises that task's budget from 3 to 4:

```
inventory: max_steps of "approve-vendor-invoice" changed from 3 to 4. proposals/2026-11-20-tighter-approval.md lists max_steps:approve-vendor-invoice under tightens, but 3 to 4 loosens it, so it covers nothing: a decided proposal must list "approve-vendor-invoice" under changes.
```

Pull request 49's class fails today on Meridian's detail page. A class on that page, styled in `products/meridian/styles.css`, gives:

```
inventory: page CSS ".vendor-summary" is not a registered content layout.
```

Once part 2 removes the rule, the same change passes with no proposal.

## Adoption

Part 2 is one pull request.

- `packages/harness/src/lib/proposals.ts` adds `tightens` to the front-matter keys and the pinned lists, refuses `adds` or `tightens` beside `changes`, `retires` or `opts-out` or on a proposal that is not `adopted`, lets a new proposal start `adopted` when it lists only `adds` or `tightens`, picks up `tightens`-only proposals where `addingInThisChange` picks up `adds`, and keeps `## States` tied to `changes` and `adds`.
- `membershipChanges` moves out of `check-inventories.ts`, which runs as a script on import, into a lib module that Vitest can call. It compares `max_steps` and `success_state` per task id, `disclosed_sections` per section, previews per (state, query) pair, task graphs per task, and `shells` per entry, so each change is judged item by item.
- `packages/harness/src/check-inventories.ts` marks a new page type with its own `shells` entry, new tasks and new preview pairs as additions, and each stricter value above as a tightening. It covers them with a proposal this change adds, prints the rule and slots a new page type joins, and refuses a mixed-direction change. Its header comment, `ADDABLE_LISTS`, the page-type note, the branch that refuses a page type under `adds`, and the pass text "which a designer reviews" follow.
- `packages/harness/src/lib/shells.ts` stops saying a new page type takes two pull requests; `lint:slots` and `check:one-thing` print that message too.
- `packages/harness/src/lib/collection-body.ts` drops `pageCssViolations` and the helpers only it uses, once plan item 1 is on `main`. `paths.styles` stays in each config, since removing it would be a config change.
- `packages/harness/design-loop.ts`: the `scope` router's question and the `approval` node's label and approver change as above, with their edge labels kept. `lib/loop.ts` and `opt-outs.ts` stop calling the gate a designer's review. `npm run check:loop -- --write` redraws the diagram.
- Tests. Under `--base`, a fixture never compares `shells` or `flows`, so the shells, tasks and preview cases are Vitest cases on the moved `membershipChanges`: a page type with its own entry passes, an existing entry moved fails, a collection entry with no body slot fails, a new task passes, a preview pair added passes, a pair moved between states fails, a tightened cap passes, a mixed-direction budget change fails. Fixture cases, where the inputs are files the fixture base can hold: `tightens-a-cap` passes, `illegal/tightens-the-wrong-way` and `illegal/tightens-with-changes` fail, and a detail-page class with no proposal passes once the page-CSS rule is gone. `illegal/adds-a-page-type` becomes a page type under `adds` with a `shells` entry the base had changed. `page-type-in-two-pull-requests` still passes.
- Docs: `CLAUDE.md`, `AGENTS.md`, the verify skill, `proposals/README.md`, the harness README, `how-it-works.md` and the `CODEOWNERS` comments describe the three paths and the gate. Ben's standing yes of Nov 11 covers `CLAUDE.md` and the verify skill in a pull request that changes a check. Proposals 0012 and 2026-11-12-page-types-take-two-pull-requests keep their text, and the README says which of their rules this proposal replaced. Plan item 5 is generating the check reference in parallel, so part 2 merges `main` in and edits whatever that item left hand-written.
- Status: this proposal moves to `adopted`.

Proof, after part 2 merges: three throwaway branches from `main`, each a single pull request that passes CI, then closed and not merged, since products are demos and their real pages arrive in their own pull requests.

1. A new page type with its shell and `shells` entry.
2. A new Nook preview that shows Quarry, or, if plan item 4 has landed, a Quarry scenario with no proposal.
3. Pull request 49's `.vendor-summary` class on Meridian's detail page, with no proposal, once the page-CSS rule is gone.
