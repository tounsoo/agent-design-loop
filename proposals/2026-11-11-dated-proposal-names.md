---
status: adopted
changes: []
---
# Proposals are named by date and slug, not by the next number

Decided, and graduated with its own pull request. Ben asked for proposal IDs that parallel pull requests cannot both claim, after Meridian's Steps demo took 0014 while the Nook demo, written at the same time, needed the next number too. No inventory changes, so it lists no changes and graduates at once. It is the first proposal named this way.

Rule or input: how a proposal file is named, and what `check:proposals` reads from the name. No product input, `max_steps`, rule cap, catalog export, layout, content layout, page type, flow state, adapter field or product config changes. `check:rules` does not change, so no product can opt out of anything new.

- **The name.** A proposal's file name is its ID. A new one is named for the UTC day it is written and a short lowercase slug, `2026-11-12-side-panel.md`, and is cited by that name.
- **The check.** `check:proposals` fails a proposal file the change adds, or renames, whose name is not a real calendar day no later than tomorrow in UTC, then a slug of lowercase letters, digits and single hyphens. Tomorrow leaves room for a writer ahead of UTC. Its message suggests the dated name with the old file's slug. It also fails a new proposal whose name a proposal in another folder it reads already has, such as a product's own `paths.proposals`, where git would merge both.
- **The proposals already merged.** 0001 onward keep their numbered names. A decided or graduated proposal cannot be renamed, because its file is the record of what was approved, and nothing gains from renaming the open ones. Every check already keys a proposal by its path, and an opt-out names its proposal by path, so no check reads the number.

## Reason

A number is a counter shared by every pull request, and parallel pull requests read it at the same time. Nothing caught a duplicate: two files named `0014-a.md` and `0014-b.md` do not conflict in git and both pass every check, so two proposals 0014 could both merge, and "proposal 0014" would then name two things.

A date and a slug need no shared counter. Two proposals written on the same day differ by slug, because each names what it changes. Two with the same date and slug are the same file name, which git refuses to merge when their texts differ, so even that collision is caught before main. Two identical files merge as one, which loses nothing. The date also sorts proposals by the day they were written, and the dated names sort after the numbered ones, so a listing of `proposals/` still reads in order.

Two other schemes were weighed. A check or bot that assigns the next number at merge would have to rename the proposal after it is approved, which `check:proposals` forbids for a decided proposal, would need something that writes to `main` after the merge, and would leave a pull request unable to cite its own proposal before it lands. A check that fails a duplicate number keeps the counter and only moves the collision to whichever pull request merges second, which still renumbers. A random ID would collide never but read as nothing.

The cost is a longer citation: proposal 2026-11-12-side-panel, where it was proposal 0014. A link carries it in prose.

## Preview

A pull request that adds a numbered proposal, as the Meridian demo did:

```
proposals: compared with f1ed1b0:
- proposals/0014-invoice-progress-steps.md is a new proposal, so its name is the UTC day it was written and a lowercase slug, such as proposals/2026-11-12-invoice-progress-steps.md. A dated name cannot collide with a proposal another pull request adds in parallel, as the next free number can.
```

The same proposal renamed to `proposals/2026-11-12-invoice-progress-steps.md` passes, and so does a parallel `proposals/2026-11-12-nook-hold-ends.md`.

## Adoption

- No file changes on approval. These change in the same pull request:
  - `packages/harness/src/lib/proposals.ts` adds `nameProblems` and `sharedNameProblems`, with its tests in `proposals.test.ts`.
  - `packages/harness/src/check-proposals.ts` runs it on every proposal folder it reads.
  - The docs: `proposals/README.md`, the harness README, `how-it-works.md`, `CLAUDE.md` and the verify skill.
- What the check still cannot do: tell whether the date is the day the proposal was written. It checks that the date is real and not in the future, not that it is the day the file was written: a pull request that sat open for a week keeps its first day, which is fine.
