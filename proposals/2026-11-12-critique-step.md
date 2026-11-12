---
status: adopted
changes: []
---
# A second model critiques the screenshots, with an edge back to build

Decided by Ben on Nov 12, 2026, as item 2 of the plan from the harness eval ("Do all in ideal order"), and adopted with its own pull request. It changes the design loop and adds a helper script. No product's inputs, rules, catalog, layouts, page types, flows or config change, so it lists no changes and is adopted at once.

Rule or input: the design loop gains one node, `critique`, between `screenshots` and `note`, with an edge back to `build`, and the harness gains one script, `npm run critique`. No check changes, and no rule in `check:rules` changes, so no product can opt out of anything new.

- **The node.** `critique` is a router that reads and writes the product's `review/` folder. Its question is whether a second model, not the one that built the change, finds a problem in the screenshots to fix before review. `revise` goes back to `build`, and from there through the gate and a retake of the screenshots. `pass` goes on to `note`. The `screenshots` to `note` edge goes.
- **The script.** `npm run critique -- --config <product config> --gallery <folder> --brief <file>` writes the critic's brief: the product's tasks and ranked actions, every screenshot of the change with the base's for comparison, a rubric of four patterns and the answer's JSON shape. The harness calls no model: the agent gives the brief to a different model. `--findings <file> --trace <trace>` reads the answer back, refuses one that names a pattern, a severity or a screenshot the gallery does not have, writes `CRITIQUE.md` into the gallery, and prints the edge, the `loop:step` line and the block for the pull request description.
- **The rubric.** Hierarchy, the primary action, grouping and crowding, each with the questions the critic answers for every page. A finding is `revise` only when the change breaks one of the four, and `note` otherwise, including a problem the base already had that the change does not make worse.
- **The rounds.** The critique may send a run back to `build` twice. The third critique of a run, counted from the trace's `critique` steps that took `revise` since the run's start, prints `pass`, and what is left open goes in the review note.
- **Advisory.** The build gate does not run it, and no check reads `CRITIQUE.md`. `check:trace` fails a trace that skips the step, as it fails one that skips any node, but takes `pass` and `revise` alike.

## Reason

The eval found that the checks read code, not the page, and that judgment was written down and not acted on. PR 48's review note named the crowding, the heading weight and the waitlist question, and the pull request went on to "green, ready", because `note` was the loop's last step before the pull request and nothing led back to `build`. PR 49's thread had to rewrite its trace to make a fix after looking at its screenshots.

A critique after the screenshots looks at what the person will see. It judges patterns that hold on any page, never a count: Ben ruled out section budgets and per-page numbers on Nov 12. So the rubric asks whether section headings read as clearly below the title, not how many sections there are, and a long page in good order passes.

The critic is a second model, not the builder, so it does not grade its own work. In this repository it comes from `.claude/pstack-models.md`, which names no Fable. A noisy critic is the main risk, so the rubric is fixed, each finding must name a pattern and a screenshot the change shows, the severity rule ties `revise` to a broken pattern the change caused, and the rounds stop at two.

The node is a router, not an eval node, because an eval node runs `check` scripts with a `pass` and a `fail` edge, and the gate stays free of model calls. It writes `review/`, which no eval node reads, so `check:loop` still holds that every end follows a passing gate, and the `revise` edge reaches the pull request only through `build` and the gate.

It starts advisory, as Ben asked. A later decision can make it blocking, for example by having `check:trace` require the last `critique` step's `CRITIQUE.md` to have no `revise` finding left.

A trace written before this lands goes from `screenshots` to `note`, which the graph no longer has. `check:trace` reads only the traces a change adds or edits, so the merged traces stay as they are. An open pull request whose trace was written before this, such as PRs 48 and 49, adds a `critique` step when it merges `main`.

## Preview

The loop, from the gate on: `checks` (pass), `screenshots`, `critique` (revise), `build`, `checks` (pass), `screenshots`, `critique` (pass), `note`, `pull-request`.

`npm run critique -- --config products/nook/harness.config.ts --gallery products/nook/review/screenshots/<change> --findings <file> --trace traces/<change>.jsonl`, on a critique with one `revise` finding:

```text
critique: wrote products/nook/review/screenshots/<change>/CRITIQUE.md for products/nook, round 1: 3 findings, 1 to fix before review.
critique: revise. Go back to build, fix each finding under Fix before review, and walk the loop again. Then record the step:

npm run loop:step -- traces/<change>.jsonl critique revise
```

A trace that skips the step fails `check:trace` with `goes from screenshots to note, an edge the graph does not have. It goes to critique.`

## Adoption

No file changes later. These change in the same pull request:

- `packages/harness/design-loop.ts` gains the node and its edges, and `check:loop -- --write` redraws the diagram in `packages/harness/docs/how-it-works.md`.
- `packages/harness/src/lib/critique.ts` holds the rubric, the brief, the reading of the answer, the rounds and the markdown, with Vitest tests in `critique.test.ts`. `packages/harness/src/critique.ts` is the script, with its `critique.meta.ts`, and `package.json` names it.
- `npm run screenshots` keeps a gallery that holds a `CRITIQUE.md` it recognizes, and a retake replaces it with the rest of the folder.
- The docs: `AGENTS.md` tells the agent to run the step, `packages/harness/docs/how-it-works.md` explains it, the harness README lists it, the pull request template gains a Critique section, and `npm run docs:gen` writes the check reference and the generated lists.
