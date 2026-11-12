# Claude instructions

This repository tests whether an agent designs better UI when the rules live in the repo as data and as checks that fail the build. The sample product is **Meridian**, an accounts-payable workspace built on [Todae](https://github.com/tounsoo/todae) through one catalog file. [`AGENTS.md`](AGENTS.md) is the design loop every agent follows, Claude included: read it, and the inventories it lists in order, before changing UI. The loop itself is a graph in [`packages/harness/design-loop.ts`](packages/harness/design-loop.ts): follow its nodes and edges from `start`. [`packages/harness/docs/how-it-works.md`](packages/harness/docs/how-it-works.md) is the walkthrough for people new to the repo, and [`products/meridian/README.md`](products/meridian/README.md) covers Meridian.

## pstack

Work here uses [pstack-claude](https://github.com/michael-denyer/pstack-claude). A local Claude Code session gets the `pstack` plugin from `.claude/settings.json` once the folder is trusted, and its SessionStart hook routes tasks to poteto-mode.

Claude Duet threads: read [`.claude/thread-start.md`](.claude/thread-start.md) next. A thread attaches the repository after it starts, so no SessionStart hook fires and nothing in `.claude/` loads by itself. That page installs pstack by hand.

The model sheet is [`.claude/pstack-models.md`](.claude/pstack-models.md), pstack's project sheet. It names Opus, Sonnet and Haiku only. No Fable.

@.claude/pstack-models.md

## Set up

Node 22, the version CI runs (`engines` asks for 22 or newer). Install with `npm ci`, then `npm run setup:chrome` for the headless Chrome `check:target-size`, `check:accessible-names`, `screenshots` and the fixture cases that open a page run in. `.npmrc` sets `legacy-peer-deps`.

## Commands

The build gate. CI runs the same checks, split into one job per product:

```sh
npm run check:fixtures && npm run check
```

- `check:fixtures` runs the harness's own tests: every illegal case under `packages/harness/fixtures/` must fail with its expected message and every legal case pass with its. `npm run check:fixtures -- illegal/two-primaries` runs one case.
- `check` runs typecheck, ESLint and the Vitest suite on the whole repository, then `check:products`, which runs `check:product` on every product's config, `check:opt-outs` and every rule check in `check:rules`, then the repository checks. A product is any `harness.config.ts` git knows of outside `packages/harness/`, so nothing lists products by hand. [The check reference](packages/harness/docs/checks.md) lists the exact order.
- `check:trace` is not in `check`, because the gate runs in the middle of the design loop's walk: CI runs it after the gate, and an agent runs it before pushing.

Every harness script, in one line each. [The check reference](packages/harness/docs/checks.md) says what each one fails, the flags it reads, whether it compares with the base (`INVENTORY_BASE`) or opens Chrome, and the fixture cases that prove it. `npm run docs:gen` writes this list and the reference from the code and each script's `packages/harness/src/<script>.meta.ts`, and `npm run check:docs` fails when either is stale. Don't edit the list by hand.

<!-- docs:gen scripts start -->
- [`lint:product-ui`](packages/harness/docs/checks.md#lintproduct-ui), rule, needs `--config`: Product UI is built only from the product's catalog: no raw controls, no inline styles, no other component kit, nothing from another product.
- [`lint:slots`](packages/harness/docs/checks.md#lintslots), rule, needs `--config`: Each page type with a primary slot holds its page's one primary action there.
- [`check:step-budget`](packages/harness/docs/checks.md#checkstep-budget), rule, needs `--config`: Every route that finishes a task, not only the shortest, fits that task's `max_steps`, in the task graph and in the shipped reducer.
- [`check:disclosure`](packages/harness/docs/checks.md#checkdisclosure), rule, needs `--config`: Each page holds at most `MAX_DISCLOSURES_PER_PAGE` disclosures, nested at most `MAX_DISCLOSURE_DEPTH` deep.
- [`check:priority`](packages/harness/docs/checks.md#checkpriority), rule, needs `--config`: Each page holds at most one primary action, and it is the product's rank-1 action; the rank-2 action is secondary; `disclosed_sections` stay behind disclosures.
- [`check:one-thing`](packages/harness/docs/checks.md#checkone-thing), rule, needs `--config`: One job per page: no page inside a page, no primary on a collection or content page, and at most `MAX_VISIBLE_QUESTIONS` questions outside a disclosure.
- [`check:inventories`](packages/harness/docs/checks.md#checkinventories), rule, needs `--config`: Inventory membership changes only by adopting a proposal, and each inventory's folders, barrels and uses match its list.
- [`check:state-coverage`](packages/harness/docs/checks.md#checkstate-coverage), rule, needs `--config`: Every modeled flow state has a view.
- [`check:target-size`](packages/harness/docs/checks.md#checktarget-size), rule, needs `--config`: Every control on every preview is at least 24 CSS px, or meets the WCAG 2.5.8 spacing exception, measured in headless Chrome.
- [`check:accessible-names`](packages/harness/docs/checks.md#checkaccessible-names), rule, needs `--config`: On every preview, what a screen reader hears matches the flow's `accessible-names.ts`, and every press either announces what changed or moves focus.
- [`check:opt-outs`](packages/harness/docs/checks.md#checkopt-outs), product, needs `--config`: Every opt-out in a product's config stands on an adopted proposal that names the rule and the product.
- [`check:products`](packages/harness/docs/checks.md#checkproducts), repository: Runs `check:product` on every product the registry finds, one after another, so a new product needs no script or CI job of its own.
- [`check:proposals`](packages/harness/docs/checks.md#checkproposals), repository: Every proposal has its fields and sections, a new one has a dated name, and each status moves one step at a time from the base.
- [`check:retirement`](packages/harness/docs/checks.md#checkretirement), repository: A rule most products opt out of is flagged for retirement, and a rule leaves `check:rules`, or a product opts out, only by adopting a proposal.
- [`check:loop`](packages/harness/docs/checks.md#checkloop), repository: The design loop graph in `packages/harness/design-loop.ts` is one an agent can follow, and the diagram in `how-it-works.md` is the one it draws.
- [`check:docs`](packages/harness/docs/checks.md#checkdocs), repository: The check reference and the docs that copy it are the ones the code writes: `npm run docs:gen` rewrites them.
- [`check:fixtures`](packages/harness/docs/checks.md#checkfixtures), repository: The harness's own tests: every illegal fixture case fails with its expected message, and every legal case passes with its.
- [`check:product`](packages/harness/docs/checks.md#checkproduct), product, needs `--config`: Runs `check:opt-outs`, then every rule check in `check:rules`, on one product, skipping a rule the product opts out of.
- [`check:trace`](packages/harness/docs/checks.md#checktrace), repository: A change that touches a product carries a loop trace, and every trace it adds or edits is a walk the design loop graph allows.
- [`critique`](packages/harness/docs/checks.md#critique), tool, needs `--config`: The design loop's `critique` step: writes the brief for a second model to judge the screenshots, then records its findings and the edge back to build or on to the note.
- [`loop:step`](packages/harness/docs/checks.md#loopstep), tool: Appends one step to a change's loop trace, and refuses a step the design loop graph does not allow.
- [`new:product`](packages/harness/docs/checks.md#newproduct), tool: Starts a product: copies the harness's fixture product, which passes every check, to `products/<name>/` and points its config there.
- [`screenshots`](packages/harness/docs/checks.md#screenshots), tool, needs `--config`: The design loop's `screenshots` step: captures each preview before and after a change into a gallery the pull request links.
- [`setup:chrome`](packages/harness/docs/checks.md#setupchrome), tool: Installs the chrome-headless-shell build `puppeteer-core` pins into `.cache/chrome`, where the Chrome checks look for it.
<!-- docs:gen scripts end -->

`npm run screenshots` is the design loop's `screenshots` step, not a check: `AGENTS.md` says when to run it and how to pin and link the gallery, and its entry in the reference gives its flags.

`npm run new:product -- <name>` starts a product: it copies the fixture product to `products/<name>/` and points its config there. Nothing else needs an edit for the checks and CI to pick it up, but a new product is an inventory change, so it lands with a proposal decided on the base that lists `products/<name>` under `changes`.

A page type is one of three kinds in the config's `shells`: `primarySlots` (one primary action in a named slot), `collections` (no primary, a registered content layout in the body) or the optional `content` (a page that shows information and holds no primary button outside the shared chrome layouts). `lint:slots`, `check:one-thing` and `check:inventories` fail a page type in none of them or in two.

Others: `npm run dev` starts Meridian on Vite's port and `npm run dev:nook` starts Nook; `npm run build` and `npm run preview` serve Meridian's built app.

## Verify

Prove every change with [`.claude/skills/verify/SKILL.md`](.claude/skills/verify/SKILL.md). It runs the build gate, then drives the surface the change touches, and ends in PASS, FAIL or BLOCKED.

## Conventions

- Follow the loop in `AGENTS.md`. Import UI only from the product's catalog, `products/meridian/catalog/index.ts` for Meridian. A missing catalog export, layout, content layout, page type, flow state or rule input is a proposal under `proposals/`, never an edit to an inventory. The inventory edit waits for a later pull request, once the proposal is decided on the change's base (`main` for a pull request into `main`), unless it only adds or tightens: then a proposal that lists it under `adds` or `tightens` is adopted with it, and a new page type with its own `shells` entry goes under `adds` as `page-type:<id>` (`proposals/README.md`).
- Agents don't merge, delete branches, force-push or rebase without Ben's yes.
- Push only once the build gate and an internal review are green. Draft pull requests are fine; mark one ready once its CI is green.
- A pull request that adds or changes a check also updates `CLAUDE.md` and the verify skill in `.claude/skills/verify/SKILL.md` in the same pull request, so neither describes a check that no longer exists. Their check lists are generated, so for those parts that means changing the check's `.meta.ts` and running `npm run docs:gen`; `check:docs` fails a pull request that leaves them stale. Edit their hand-written parts by hand. Ben gave that standing yes on 2026-11-11.
- Change `CLAUDE.md` and anything in `.claude/` only with Ben's yes. Leave Cursor's own config alone.
- Where these docs and the code disagree, follow the code and say so in the pull request.
