---
status: adopted
changes: []
---
# Call the last step adopting, not graduating

Decided, and adopted with its own pull request. Ben asked to rename "graduate" to "adopt". A proposal that only adds now lands in the same pull request that writes it, and "graduate" reads as a later stage it never reaches. No inventory changes, so it lists no changes and is adopted at once.

Rule or input: the name of a proposal's last status, of the section that says what changes, and of the design loop node that applies a proposal. No product input, `max_steps`, rule cap, catalog export, layout, content layout, page type, flow state, adapter field or product config changes. `check:rules` does not change, so no product can opt out of anything new.

- **The status.** `status: graduated` becomes `status: adopted`. Statuses still move only open → decided → adopted.
- **The section.** `## Graduation` becomes `## Adoption`, still required with text under it.
- **The loop.** The design loop's `graduate` node becomes `adopt`. A trace written before this change and never edited again keeps `graduate`, since `check:trace` reads only the traces a change adds or edits; none on main used it.
- **The checks.** `check:proposals`, `check:inventories`, `check:opt-outs` and `check:retirement` read the new names. A proposal in the change that says `status: graduated` or `## Graduation` fails, with a message naming the new one. A proposal on the base still counts with the old names, as `adopted` and `## Adoption`, so a pull request whose base predates this change compares cleanly. Such a branch merges `main` in before it merges, as the rules here ask, which brings the renamed proposals; it then fixes only a proposal it adds itself with the old names.
- **The proposals already merged.** Their `status` and `## Graduation` heading change, because the checks read both. Their file names do not, since a decided or adopted proposal keeps its name, so [proposal 0011](0011-proposal-fields-and-graduation.md) keeps "graduation" in its file name. Their prose still says graduate: it is the record of what was decided, and one line in the proposals README says it means adopt.

## Reason

"Graduate" pictured a proposal finishing a course: written, approved, then graduating in a later pull request. Since [proposal 0012](0012-additions-in-one-pull-request.md), a proposal that only adds lands in the pull request that writes it, and the word no longer fits that path. "Adopt" names what the pull request does to the proposal, whichever path it took: it adopts the decision into the inventories or the rules.

Keeping "graduated" as a second accepted value was weighed. It would let a pull request open before this change pass unchanged, but two names for one status would stay in the format for good, and the rename is meant to leave one. Reading the old names only on the base keeps comparisons with an older base working without letting a new proposal use them.

## Preview

A proposal the change adds with the old names:

```
proposals: compared with 1caa889:
- proposals/2026-11-12-side-panel.md status "graduated" was renamed: write "status: adopted".
- proposals/2026-11-12-side-panel.md has "## Graduation", which was renamed: call the section "## Adoption".
```

`check:inventories` prints `Adopts <proposal>` where it printed `Graduates <proposal>`.

## Adoption

- No file changes on approval. These change in the same pull request:
  - `packages/harness/src/lib/proposals.ts` renames the status, the section and `adopting()`, and reads the old names on the base, with its tests in `proposals.test.ts`.
  - `check-proposals.ts`, `check-inventories.ts`, `check-retirement.ts`, `lib/opt-outs.ts` and their messages; the fixture cases, four of them renamed (`adopts-open-request`, `adopts-with-its-proposal`, `adoption-not-marked`, `adds-adopted-before`).
  - `packages/harness/design-loop.ts` renames the `graduate` node, and the diagram in `how-it-works.md` is redrawn.
  - Every merged proposal's `status` and `## Graduation` heading.
  - The docs: `proposals/README.md`, the harness README, `how-it-works.md`, `AGENTS.md`, `CODEOWNERS`, Meridian's review notes, `CLAUDE.md` and the verify skill.
- What it leaves: the prose of merged proposals, and the file name of proposal 0011.
