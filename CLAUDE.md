# Claude instructions

This repository tests whether an agent designs better UI when the rules live in the repo as data and as checks that fail the build. The sample product is **Meridian**, an accounts-payable workspace built on [Todae](https://github.com/tounsoo/todae) through one catalog file. [`AGENTS.md`](AGENTS.md) is the design loop every agent follows, Claude included: read it, and the inventories it lists in order, before changing UI. The loop itself is a graph in [`packages/harness/design-loop.ts`](packages/harness/design-loop.ts): follow its nodes and edges from `start`. [`packages/harness/docs/how-it-works.md`](packages/harness/docs/how-it-works.md) is the walkthrough for people new to the repo, and [`products/meridian/README.md`](products/meridian/README.md) covers Meridian.

## pstack

Work here uses [pstack-claude](https://github.com/michael-denyer/pstack-claude). A local Claude Code session gets the `pstack` plugin from `.claude/settings.json` once the folder is trusted, and its SessionStart hook routes tasks to poteto-mode.

Claude Duet threads: read [`.claude/thread-start.md`](.claude/thread-start.md) next. A thread attaches the repository after it starts, so no SessionStart hook fires and nothing in `.claude/` loads by itself. That page installs pstack by hand.

The model sheet is [`.claude/pstack-models.md`](.claude/pstack-models.md), pstack's project sheet. It names Opus, Sonnet and Haiku only. No Fable.

@.claude/pstack-models.md

## Set up

Node 22, the version CI runs (`engines` asks for 22 or newer). Install with `npm ci`, then `npm run setup:chrome` for the headless Chrome `check:target-size` and three fixture cases measure in. `.npmrc` sets `legacy-peer-deps`.

## Commands

The build gate. CI runs the same checks, split into one job per product:

```sh
npm run check:fixtures && npm run check
```

- `check:fixtures` runs the harness's own tests. `packages/harness/fixtures/product/` is a small product with its own `harness.config.ts` that every check passes. Every other folder directly under `packages/harness/fixtures/` or its `illegal/` is a case whose `case.ts` changes some of that config's paths and names the checks to run on it, each as its npm script with `--config`. It passes only when every illegal case fails with its expected message and every legal case passes with its expected message. A folder with no `case.ts` fails the run. A case that sets `base` may also give `proposals` and `baseProposals`, folders `check:inventories` reads as the change's proposals and the base's. Three cases build their own page and measure it, so like `check:target-size` the run needs Chrome. `npm run check:fixtures -- illegal/two-primaries` runs one case.
- `check` runs typecheck, ESLint and the Vitest suite on the whole repository, then `check:product` on Meridian's config and on Nook's, then `check:proposals`, then `check:retirement`, then `check:loop`. `check:product` first runs `check:opt-outs`, then every rule check in `check:rules`: off-catalog UI, detail slots, step budget, disclosure, priority, one-thing, inventories, state coverage and target size, in that order. It skips a rule the product opts out of in its config's `optOuts`. Each rule check needs `--config <product config>`; there is no config at the root. The harness README's "Run the checks" table says what each one fails.
- `check:proposals` takes no `--config`. Every proposal starts with front matter, `status` (`open`, `decided` or `graduated`) and `changes` (the exact inventory names it changes, or `[]`), with optional `retires` and `opts-out` lists, then `## Reason`, `## Preview` and `## Graduation` sections with text. It fails a file without them, and, compared with the base, a status that moves more than one step or backwards, a decided proposal whose lists change, a decided or graduated proposal renamed or deleted, and a new proposal that starts `graduated` while it lists anything. `proposals/README.md` has the format.
- `check:opt-outs` fails an opt-out that has no graduated proposal directly in the product's `paths.proposals` folder (`proposals/` by default) listing `<rule> for <paths.source>` under `opts-out`, or that names a rule outside `check:rules`. Off-catalog UI and inventories cannot be opted out. `check:retirement` takes no `--config`: it reads every product's `harness.config.ts`, checks their opt-outs, and fails when a majority of products, and at least two, opt out of the same rule. Compared with the base, it also fails a rule that leaves `check:rules`, or a new opt-out, unless the change graduates a proposal decided on the base that lists it under `retires` or `opts-out`. [Proposal 0008](proposals/0008-rule-opt-out-and-retirement.md) and [proposal 0010](proposals/0010-proposal-fields-and-graduation.md) have the rules.
- `check:loop` takes no `--config`. It fails when the design loop graph in `packages/harness/design-loop.ts` has a dangling edge or unreachable node, an eval node that names a missing script or has no retry on `fail`, a human gate with no `CODEOWNERS` owner, or an end the run can reach without an eval node passing after the last change, and when the diagram in `packages/harness/docs/how-it-works.md` is stale. `npm run check:loop -- --write` redraws the diagram. [Proposal 0009](proposals/0009-design-loop-graph.md) records the graph.
- `check:target-size` builds the product's app, serves it with `vite preview` on port 4173 and measures controls in headless Chrome. It finds Chrome at `CHROME_PATH`, then the chrome-headless-shell that `npm run setup:chrome` installs into `.cache/chrome` (the build `puppeteer-core` pins; CI runs the same script), then the usual `/usr/bin` paths. Without one it fails, naming where it looked and both fixes.
- `check:inventories` compares inventory membership with `INVENTORY_BASE` when set. CI sets it to the pull request base, or on a push to `main` to `github.event.before`, the tip of `main` before the push. Unset, it uses the merge base with `origin/main`, or with a local `main`. A membership change passes only when it graduates a proposal: `status: decided` on the base, `status: graduated` in the change, with what changed listed under `changes` on the base. A proposal the change adds covers nothing, so an inventory change takes two pull requests, approval then graduation; [proposal 0010](proposals/0010-proposal-fields-and-graduation.md) has the rule.

Others: `npm run dev` starts Meridian on Vite's port and `npm run dev:nook` starts Nook; `npm run build` and `npm run preview` serve Meridian's built app.

## Verify

Prove every change with [`.claude/skills/verify/SKILL.md`](.claude/skills/verify/SKILL.md). It runs the build gate, then drives the surface the change touches, and ends in PASS, FAIL or BLOCKED.

## Conventions

- Follow the loop in `AGENTS.md`. Import UI only from the product's catalog, `products/meridian/catalog/index.ts` for Meridian. A missing catalog export, layout, content layout, page type, flow state or rule input is a proposal under `proposals/`, never an edit to an inventory. The inventory edit waits for a later pull request, once the proposal is decided on `main`.
- Agents don't merge, delete branches, force-push or rebase without Ben's yes.
- Push only once the build gate and an internal review are green. Draft pull requests are fine; mark one ready once its CI is green.
- Change `CLAUDE.md` and anything in `.claude/` only with Ben's yes. Leave Cursor's own config alone.
- Where these docs and the code disagree, follow the code and say so in the pull request.
