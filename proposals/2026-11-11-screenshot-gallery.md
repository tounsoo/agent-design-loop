---
status: adopted
changes: []
---
# A change that renders shows each state in a screenshot gallery

Decided, and graduated with its own pull request. Ben decided on Nov 11 that every pull request that changes a screen shows a screenshot of each preview of every state it touches, each opening full size on a click, and picked a gallery page the pull request links as the way to show them. This records that change, which lands with its own pull request, so nothing graduates later.

Rule or input: the design loop gains one node, `screenshots`, between the build gate passing and the review note, and the harness gains one script, `npm run screenshots`. No product input, rule cap, catalog export, flow state, adapter field or product config changes. No check changes, and no rule in `check:rules` changes, so no product can opt out of anything new.

## Reason

A reviewer judges a screen by looking at it, and the build gate cannot look for them. Meridian's pull request 32 had screenshots, but nothing in the loop said how to take them or show them. They were committed PNGs named in the description as plain file names, so none opened on a click.

Images in a pull request description are not an option for the agent: where it runs, an image in a description it posts arrives as plain text, on every route tried, and that limit is deliberate. A markdown file in the repository is different. GitHub renders a folder's `README.md` with its images, and an image wrapped in a link to its own file opens full size on a click. So each change commits its screenshots in one folder with a gallery `README.md`, and its description carries one plain link to that gallery, pinned to the pushed commit's full SHA, with the whole `https://github.com/` address. A relative link resolves only on github.com itself, not in the GitHub app or in email. A branch link breaks once the branch is deleted.

The screenshots come from a script, not by hand, so every change takes them the same way: the previews `check:target-size` already opens, derived from each flow's `modeledStates` and the config's `previews`, at 1280 by 900 CSS px in the same headless Chrome. `--state` keeps the states the change touches. `--base <ref>` takes the same previews at the base too, from a temporary worktree, so the gallery shows before and after side by side.

The loop gets a node rather than a line in the verify skill, so the step is in the trace a reviewer reads and in the diagram. It sits after the gate passes, because a screenshot of a failing build shows a screen that will not ship, and before the review note, so the note can point at a state in the gallery. It writes the product's `review/` folder, which no eval node reads, so `check:loop` still holds that every end follows a passing gate. The node replaces the `checks` to `note` edge, so a trace recorded before it no longer walks the graph. `check:trace` reads only the traces a change adds or edits, so the traces already merged stay as they are. A pull request whose trace was written before this lands adds its `screenshots` step when it merges `main`.

No check requires the screenshots. A check could require the folder for a change to a product, but not that the pull request links it, and the trace already records the step. If changes keep arriving without a gallery, that is the lesson that earns a check.

## Preview

```sh
npm run screenshots -- --config products/meridian/harness.config.ts \
  --out products/meridian/review/screenshots/<change> --base origin/main --state invoice-approved
```

It writes `before/invoice-approved--page-detail.png`, `after/invoice-approved--page-detail.png` and `README.md`, a table with one row per preview whose cells are `[![invoice-approved--page-detail, after](after/invoice-approved--page-detail.png)](after/invoice-approved--page-detail.png)`. It prints the line for the pull request body:

```md
**Screenshots:** [1 preview, before and after](https://github.com/<owner>/<repo>/blob/<sha>/products/meridian/review/screenshots/<change>/README.md)
```

The loop, from the gate on: `checks` (pass), `screenshots`, `note`, `pull-request`.

## Adoption

`packages/harness/design-loop.ts` gains the `screenshots` node and its edges, and the diagram in `packages/harness/docs/how-it-works.md` is redrawn. `packages/harness/src/screenshots.ts` and `packages/harness/src/lib/screenshots.ts` are the script, `package.json` names it, and `packages/harness/src/lib/config.ts` lets it read `--out`, `--state` and `--base`. The verify skill, `CLAUDE.md`, `AGENTS.md`, the harness README and walkthrough, and the new `.github/pull_request_template.md` describe the step.
