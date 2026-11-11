# Claude instructions

This repository tests whether an agent designs better UI when the rules live in the repo as data and as checks that fail the build. The sample product is **Meridian**, an accounts-payable workspace built on [Todae](https://github.com/tounsoo/todae) through one catalog file. [`AGENTS.md`](AGENTS.md) is the design loop every agent follows, Claude included: read it, and the inventories it lists in order, before changing UI. [`docs/how-it-works.md`](docs/how-it-works.md) is the walkthrough for people new to the repo.

## pstack

Work here uses [pstack-claude](https://github.com/michael-denyer/pstack-claude). A local Claude Code session gets the `pstack` plugin from `.claude/settings.json` once the folder is trusted, and its SessionStart hook routes tasks to poteto-mode.

Claude Duet threads: read [`.claude/thread-start.md`](.claude/thread-start.md) next. A thread attaches the repository after it starts, so no SessionStart hook fires and nothing in `.claude/` loads by itself. That page installs pstack by hand.

The model sheet is [`.claude/pstack-models.md`](.claude/pstack-models.md), pstack's project sheet. It names Opus, Sonnet and Haiku only. No Fable.

@.claude/pstack-models.md

## Set up

Node 22, the version CI runs (`engines` asks for 22 or newer). Install with `npm ci`. `.npmrc` sets `legacy-peer-deps`.

## Commands

The build gate, the same command CI runs:

```sh
npm run check:fixtures && npm run check
```

- `check:fixtures` passes only when every case under `fixtures/illegal/` fails its check.
- `check` runs typecheck, lint (ESLint, off-catalog UI, detail slots), step budget, disclosure, priority, one-thing, inventories, state coverage, target size and the Vitest suite, in that order. The README's "Run the checks" table says what each one fails.
- `check:target-size` builds the app, serves it with `vite preview` on port 4173 and measures controls in headless Chrome. It finds Chrome at `CHROME_PATH` or the usual `/usr/bin` paths, and fails without one.
- `check:inventories` compares inventory membership with `INVENTORY_BASE` (CI sets the pull request base), or with the merge base of `origin/main` when that is unset.

Others: `npm run dev` starts the app on Vite's port; `npm run build` and `npm run preview` serve the built app.

## Verify

Prove every change with [`.claude/skills/verify/SKILL.md`](.claude/skills/verify/SKILL.md). It runs the build gate, then drives the surface the change touches, and ends in PASS, FAIL or BLOCKED.

## Conventions

- Follow the loop in `AGENTS.md`. Import UI only from `src/catalog/index.ts`. A missing catalog export, layout, content layout, page type, flow state or rule input is a proposal under `proposals/`, never an edit to an inventory.
- Agents don't merge, delete branches, force-push or rebase without Ben's yes.
- Push only once the build gate and an internal review are green. Draft pull requests are fine; mark one ready once its CI is green.
- Change `CLAUDE.md` and anything in `.claude/` only with Ben's yes. Leave Cursor's own config alone.
- Where these docs and the code disagree, follow the code and say so in the pull request.
