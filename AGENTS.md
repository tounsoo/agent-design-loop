# Agent notes

This file is for anyone changing agent-design-loop, including agents. It holds the rules that are specific to this repo. Shared rules live in Ben's home repo, [tounsoo/home](https://github.com/tounsoo/home) (private). Use `/agent/repos/home` when that directory exists (a Cursor cloud environment). Otherwise use `~/repos/home`, cloning `https://github.com/tounsoo/home.git` there when it is missing (a local Claude or Cursor session). Only when neither works, read the same files through the GitHub MCP tools (owner `tounsoo`, repo `home`, branch `main`). Do not copy them into this repo. Read these before opening or driving a pull request:

- `AGENTS.md` there: the memory split, the learnings ladder, and how Cursor and Claude find pstack. A fact in this file overrides home.
- `CLAUDE.md` there: the Claude-only lines. This repo's `CLAUDE.md` adapts them for the temp install of pstack-claude that a Duet thread uses.
- `standards/git.md` and `standards/pull-requests.md`
- `playbooks/review-before-pr.md` and `playbooks/waiting-on-ci.md`. The **Repo lines** below fill those in. Read the playbooks from home. This repo does not keep a copy.
- `pstack.pin.json` records the Cursor pstack pin and a pstack-claude pin. This repo does not vendor pstack. A local Claude Code session enables the plugin from `.claude/settings.json`. A Duet thread installs upstream `HEAD` of pstack-claude into a temp folder, as `.claude/thread-start.md` says.

The repository tests whether an agent designs better UI when the rules live in the repo as data and as checks that fail the build. The checks enforce the rules. Inventories are data. This file does not list what they contain. A walkthrough is [`packages/harness/docs/how-it-works.md`](packages/harness/docs/how-it-works.md). Meridian's own is [`products/meridian/docs/how-it-works.md`](products/meridian/docs/how-it-works.md). Dated inventory decisions are proposals under [`proposals/`](proposals/README.md). This repo has no `docs/decisions/` record.

When this file and the code disagree, follow the code, as home's `AGENTS.md` says, and report the mismatch.

## Set up

Node 22, the version CI runs (`engines` asks for 22 or newer). Install with `npm ci`, then `npm run setup:chrome` for the headless Chrome `check:target-size`, `check:accessible-names`, `check:rendered-page`, `screenshots` and the fixture cases that open a page run in. `.npmrc` sets `legacy-peer-deps`.

## Build, test, and check

The build gate. CI runs the same checks, split into one job per product:

```sh
npm run check:fixtures && npm run check
```

- `check:fixtures` runs the harness's own tests: every illegal case under `packages/harness/fixtures/` must fail with its expected message and every legal case pass with its. `npm run check:fixtures -- illegal/two-primaries` runs one case.
- `check` runs typecheck, ESLint and the Vitest suite on the whole repository, then `check:products`, which runs `check:product` on every product's config, `check:opt-outs` and every rule check in `check:rules`, then the repository checks, ending with `check:self`. A product is any `harness.config.ts` git knows of outside `packages/harness/`, so nothing lists products by hand. [The check reference](packages/harness/docs/checks.md) lists the exact order.
- `check:trace` is not in `check`, because the gate runs in the middle of the design loop's walk. CI runs it after the gate, and an agent runs it before pushing.

Prove a change with [`.claude/skills/verify/SKILL.md`](.claude/skills/verify/SKILL.md). It runs the build gate, then drives the surface the change touches, and ends in PASS, FAIL or BLOCKED. Run it on the commit that ends a review round, before a pull request opens and before each push of new work.

Every harness script, in one line each. [The check reference](packages/harness/docs/checks.md) says what each one fails, the flags it reads, whether it compares with the base (`INVENTORY_BASE`) or opens Chrome, and the fixture cases that prove it. `npm run docs:gen` writes this list and the reference from the code and each script's `packages/harness/src/<script>.meta.ts`, and `npm run check:docs` fails when either is stale. Don't edit the list by hand.

<!-- docs:gen scripts start -->
- [`lint:product-ui`](packages/harness/docs/checks.md#lintproduct-ui), rule, needs `--config`: Product UI is built only from the product's catalog: no raw controls, no inline styles, no other component kit, nothing from another product.
- [`lint:slots`](packages/harness/docs/checks.md#lintslots), rule, needs `--config`: Each page type with a primary slot holds its page's one primary action there.
- [`check:step-budget`](packages/harness/docs/checks.md#checkstep-budget), rule, needs `--config`: Every route that finishes a task, not only the shortest, fits that task's `max_steps`, in the task graph and in the shipped reducer.
- [`check:disclosure`](packages/harness/docs/checks.md#checkdisclosure), rule, needs `--config`: Each page holds at most `MAX_DISCLOSURES_PER_PAGE` disclosures, nested at most `MAX_DISCLOSURE_DEPTH` deep.
- [`check:priority`](packages/harness/docs/checks.md#checkpriority), rule, needs `--config`: Each page holds at most one primary action, and it is the product's rank-1 action; the rank-2 action is secondary; `disclosed_sections` stay behind disclosures.
- [`check:one-thing`](packages/harness/docs/checks.md#checkone-thing), rule, needs `--config`: One job per page: no page inside a page, no primary on a collection or content page, and at most `MAX_VISIBLE_QUESTIONS` questions outside a disclosure.
- [`check:inventories`](packages/harness/docs/checks.md#checkinventories), rule, needs `--config`: Inventory membership changes only by adopting a proposal, and each inventory's folders, barrels and uses match its list.
- [`check:state-coverage`](packages/harness/docs/checks.md#checkstate-coverage), rule, needs `--config`: Every modeled flow state has a view and a scenario.
- [`check:target-size`](packages/harness/docs/checks.md#checktarget-size), rule, needs `--config`: Every control on every scenario, at desktop and phone width, is at least 24 CSS px, or meets the WCAG 2.5.8 spacing exception, measured in headless Chrome.
- [`check:accessible-names`](packages/harness/docs/checks.md#checkaccessible-names), rule, needs `--config`: On every scenario, what a screen reader hears matches the flow's `accessible-names.ts`, and every press either announces what changed or moves focus.
- [`check:rendered-page`](packages/harness/docs/checks.md#checkrendered-page), rule, needs `--config`: Every scenario, as Chrome paints it at desktop and phone width: one h1 per page and no skipped heading level, the rank-1 action in the first view, disclosures closed unless the state opens them, AA contrast in light and dark, and no sideways scroll on a phone.
- [`check:opt-outs`](packages/harness/docs/checks.md#checkopt-outs), product, needs `--config`: Every opt-out in a product's config stands on an adopted proposal that names the rule and the product.
- [`check:products`](packages/harness/docs/checks.md#checkproducts), repository: Runs `check:product` on every product the registry finds, one after another, so a new product needs no script or CI job of its own.
- [`check:proposals`](packages/harness/docs/checks.md#checkproposals), repository: Every proposal has its fields and sections, a new one has a dated name, and each status moves one step at a time from the base.
- [`check:retirement`](packages/harness/docs/checks.md#checkretirement), repository: A rule most products opt out of is flagged for retirement, and a rule leaves `check:rules`, or a product opts out, only by adopting a proposal.
- [`check:loop`](packages/harness/docs/checks.md#checkloop), repository: The design loop graph in `packages/harness/design-loop.ts` is one an agent can follow, and the diagram in `how-it-works.md` is the one it draws.
- [`check:docs`](packages/harness/docs/checks.md#checkdocs), repository: The check reference and the docs that copy it are the ones the code writes: `npm run docs:gen` rewrites them.
- [`check:docs-claim`](packages/harness/docs/checks.md#checkdocs-claim), repository: CODEOWNERS, the gallery proposal and AGENTS.md do not claim review is required, that a file link opens full size, or that a cloud agent cannot clone home.
- [`check:stale-proposal-path`](packages/harness/docs/checks.md#checkstale-proposal-path), repository: A proposal's later-landing section does not name a moved src, scripts or fixtures path, and an example that names a proposal number names that proposal or a number no proposal has.
- [`check:review-note`](packages/harness/docs/checks.md#checkreview-note), repository: A review note does not claim a held booking takes a held length, that step-budget measures one route, or a proposal rule the check does not have.
- [`check:preview-scope`](packages/harness/docs/checks.md#checkpreview-scope), repository: The page and the document title open a vendor with openVendor, not by searching knownVendors, previewVendors, vendorDirectory, or a list taken from them.
- [`check:self`](packages/harness/docs/checks.md#checkself), repository: The rule table, weeds log and suppressions match the self-correcting standard, and the trust measures are printed.
- [`check:fixtures`](packages/harness/docs/checks.md#checkfixtures), repository: The harness's own tests: every illegal fixture case fails with its expected message, and every legal case passes with its.
- [`check:product`](packages/harness/docs/checks.md#checkproduct), product, needs `--config`: Runs `check:opt-outs`, then every rule check in `check:rules`, on one product, skipping a rule the product opts out of.
- [`check:trace`](packages/harness/docs/checks.md#checktrace), repository: A change that touches a product carries a loop trace, and every trace it adds or edits is a walk the design loop graph allowed when each step was recorded.
- [`critique`](packages/harness/docs/checks.md#critique), tool, needs `--config`: The design loop's `critique` step: writes the brief for a second model to judge the screenshots, then records its findings and the edge back to build or on to the note.
- [`loop:step`](packages/harness/docs/checks.md#loopstep), tool: Appends one step to a change's loop trace, and refuses a step the design loop graph does not allow.
- [`new:product`](packages/harness/docs/checks.md#newproduct), tool: Starts a product: copies the harness's fixture product, which passes every check, to `products/<name>/` and points its config there.
- [`screenshots`](packages/harness/docs/checks.md#screenshots), tool, needs `--config`: The design loop's `screenshots` step: captures each scenario in four views, before and after a change, into a gallery the pull request links.
- [`setup:chrome`](packages/harness/docs/checks.md#setupchrome), tool: Installs the chrome-headless-shell build `puppeteer-core` pins into `.cache/chrome`, where the Chrome checks look for it.
<!-- docs:gen scripts end -->

`npm run screenshots` is the design loop's `screenshots` step, not a check. The loop section says when to run it and how to pin and link the gallery, and its entry in the reference gives its flags.

`npm run new:product -- <name>` starts a product: it copies the fixture product to `products/<name>/` and points its config there. Nothing else needs an edit for the checks and CI to pick it up, but a new product is an inventory change, so it lands with a proposal decided on the base that lists `products/<name>` under `changes`.

A page type is one of three kinds in the config's `shells`: `primarySlots` (one primary action in a named slot), `collections` (no primary, a registered content layout in the body) or the optional `content` (a page that shows information and holds no primary button outside the shared chrome layouts). `lint:slots`, `check:one-thing` and `check:inventories` fail a page type in none of them or in two. Every page's body is built from registered content layouts and the adapter's status parts, so a new block on any page is a new content layout and takes a proposal under `adds`. A collection names its chrome slots in its `collections` entry; a primary-slot page type names its chrome beside its primary slot, and a content page type names its chrome alone, in the optional `shells.chrome`; every other slot is body.

`npm run dev` starts Meridian on Vite's port and `npm run dev:nook` starts Nook. `npm run build` and `npm run preview` serve Meridian's built app on this machine. A push does not deploy a preview.

## Repo lines

These fill the **Repo lines** in home's `playbooks/review-before-pr.md` and `playbooks/waiting-on-ci.md`.

- Base branch: `main`.
- Checks, in this order: `npm run setup:chrome` when Chrome is missing, then `npm run check:fixtures`, then `npm run check` (`typecheck`, `lint`, `test`, `check:products`, `check:proposals`, `check:retirement`, `check:loop`, `check:docs`, `check:docs-claim`, `check:stale-proposal-path`, `check:review-note`, `check:preview-scope`, `check:self`). `check:products` runs `check:product` on every product config, which runs `check:opt-outs` and then every rule in `check:rules`. Before pushing, also `npm run check:trace`. On the commit that ends the review round, run `.claude/skills/verify/SKILL.md` and put its verdict in the pull request body. A change to what a product renders also walks the design loop's `screenshots` and `critique` nodes.
- Dependents to pass as context: importers of a changed catalog export; pages that use a changed layout, content layout, page type or shell; both products and the fixture product when `packages/adapter-todae/` or a harness check changes; the fixture cases that name a changed check; a flow's views, `scenarios.ts` and `accessible-names.ts` when its states change; the generated check reference, the harness README, this file's script list and the verify skill when a check's meta changes.
- Push builds a preview: no. `npm run preview` serves a local build. Nothing in CI deploys.
- Drafts: allowed. Open one after a clean round, and mark it ready once that round is clean. `.github/workflows/ci.yml` runs on `pull_request` with no `types` list, so a draft runs the same jobs as a ready pull request. A failure on a draft is a real failure. Marking ready does not start a new run: the default activity types are opened, synchronize and reopened. A conclusion from while the pull request was a draft counts when it is still the latest run of that job on the head.
- Required check names: `check`, `products`, `rule-checker`, and `product (<config>)` for each config `npm run check:products -- --json` prints. Today those are `product (products/meridian/harness.config.ts)` and `product (products/nook/harness.config.ts)`. A new product adds its own `product` job by existing. No informational check, and no preview commit status. [`packages/harness/docs/how-it-works.md`](packages/harness/docs/how-it-works.md) says `main` has no branch protection, so `CODEOWNERS` review is requested, not required.
- After merging `origin/main`: run `npm run docs:gen` and commit the files it rewrites when they changed (`packages/harness/docs/checks.md`, the script table in `packages/harness/README.md`, the script list in this file, and the generated blocks in `.claude/skills/verify/SKILL.md`). After a conflict-free merge, run the checks in the first step of the review round, push, and mark the pull request ready when it is still a draft.
- A pull request another session already watches stays untouched: no push, comment, ready or resolve. Tell Ben. A request only to check on a pull request reads its state with the GitHub MCP tools, using home's status rules plus the lines above, and leaves the pull request unchanged.
- Pull request body: [`.github/pull_request_template.md`](.github/pull_request_template.md). It keeps the three sections from home's `standards/pull-requests.md` (Verification, Unverified checks, Remaining risks) and adds Why, What changed, Screenshots, Critique and Docs vs code. Verification starts with the verify skill's verdict and the tested commit, the full SHA the checks ran on. Add Learnings and Agent-setup entries when there are any, as home's standard says.

The rule table lists the checks the repository runs. The columns, the weeds log and the suppression rules are home's `standards/self-correcting.md`. `npm run check:self` checks this table, `.agents/weeds.tsv` and `.agents/suppression-baseline.json` against that standard.

## Rule table

Tier: T0

| ID | Rule | Enforcer | Evidence | Status |
| --- | --- | --- | --- | --- |
| check-fixtures | [check:fixtures](packages/harness/docs/checks.md#checkfixtures) | `npm run check:fixtures` | #1 | seeded |
| typecheck | Typecheck | `npm run typecheck` | #1 | seeded |
| lint | ESLint | `npm run lint` | #1 | seeded |
| test | Vitest | `npm run test` | #1 | seeded |
| lint-product-ui | [lint:product-ui](packages/harness/docs/checks.md#lintproduct-ui) | `npm run lint:product-ui` | #1 | seeded |
| lint-slots | [lint:slots](packages/harness/docs/checks.md#lintslots) | `npm run lint:slots` | #1 | seeded |
| step-budget | [check:step-budget](packages/harness/docs/checks.md#checkstep-budget) | `npm run check:step-budget` | #1 | seeded |
| disclosure | [check:disclosure](packages/harness/docs/checks.md#checkdisclosure) | `npm run check:disclosure` | #1 | seeded |
| priority | [check:priority](packages/harness/docs/checks.md#checkpriority) | `npm run check:priority` | #1 | seeded |
| one-thing | [check:one-thing](packages/harness/docs/checks.md#checkone-thing) | `npm run check:one-thing` | #1 | seeded |
| inventories | [check:inventories](packages/harness/docs/checks.md#checkinventories) | `npm run check:inventories` | #6 | seeded |
| state-coverage | [check:state-coverage](packages/harness/docs/checks.md#checkstate-coverage) | `npm run check:state-coverage` | #1 | seeded |
| target-size | [check:target-size](packages/harness/docs/checks.md#checktarget-size) | `npm run check:target-size` | #1 | seeded |
| accessible-names | [check:accessible-names](packages/harness/docs/checks.md#checkaccessible-names) | `npm run check:accessible-names` | #38 | seeded |
| rendered-page | [check:rendered-page](packages/harness/docs/checks.md#checkrendered-page) | `npm run check:rendered-page` | #60 | seeded |
| opt-outs | [check:opt-outs](packages/harness/docs/checks.md#checkopt-outs) | `npm run check:opt-outs` | #20 | seeded |
| products | [check:products](packages/harness/docs/checks.md#checkproducts) | `npm run check:products` | #55 | seeded |
| product | [check:product](packages/harness/docs/checks.md#checkproduct) | `npm run check:product` | #18 | seeded |
| proposals | [check:proposals](packages/harness/docs/checks.md#checkproposals) | `npm run check:proposals` | #25 | seeded |
| retirement | [check:retirement](packages/harness/docs/checks.md#checkretirement) | `npm run check:retirement` | #20 | seeded |
| loop | [check:loop](packages/harness/docs/checks.md#checkloop) | `npm run check:loop` | #22 | seeded |
| docs | [check:docs](packages/harness/docs/checks.md#checkdocs) | `npm run check:docs` | #54 | seeded |
| trace | [check:trace](packages/harness/docs/checks.md#checktrace) | `npm run check:trace` | #23 | seeded |
| self | [check:self](packages/harness/docs/checks.md#checkself) | `npm run check:self` | #72 | seeded |
| docs-claim | [check:docs-claim](packages/harness/docs/checks.md#checkdocs-claim) | `npm run check:docs-claim` | #40 | enforced |
| stale-proposal-path | [check:stale-proposal-path](packages/harness/docs/checks.md#checkstale-proposal-path) | `npm run check:stale-proposal-path` | #19 | enforced |
| review-note-claim | [check:review-note](packages/harness/docs/checks.md#checkreview-note) | text | #27 | text |
| preview-scope | [check:preview-scope](packages/harness/docs/checks.md#checkpreview-scope) | `npm run check:preview-scope` | #69 | enforced |

## Before changing a product's UI

Every product lives under `products/<name>/`, and its `harness.config.ts` names where its inventories live. The checks find each product by that file, so nothing else lists the products. Read what its config names, in order:

1. Product inputs: `paths.inputs`
2. UX rules: `paths.rules`
3. Catalog, the only UI entry: `paths.catalog`
4. Layouts: `paths.layouts`
5. Content layouts: `paths.contentLayouts`
6. Page types: `paths.pageTypes`, with `shells` saying which kind each page type is: a page with a primary slot, a collection, or a content page
7. Flow model: each entry under `flows`
8. Proposals: `proposals/README.md`

For **Meridian**, an accounts-payable workspace, the config is `products/meridian/harness.config.ts`, and its inputs are `products/meridian/inputs/product.ts`. **Nook** is the second product, under `products/nook/`. The named task is in the product inputs. The checks themselves live in `packages/harness/`; product code does not edit them.

Layouts are product-owned shells with named slots, encoded from Todae recipes. Recipes are copyable glue, not package namespaces. Do not invent component names or props. Do not fork [Todae](https://github.com/tounsoo/todae). Import UI only from the catalog.

## Loop

Follow the graph in `packages/harness/design-loop.ts` from its `start` node. Do what each node's label says and take the edge whose `when` matches the outcome. An eval node runs its scripts, and a human node waits for its gate's review. `npm run check:loop` keeps the graph valid. The diagram is in `packages/harness/docs/how-it-works.md`.

Trace: record the walk as you go. Each time you take a node, run `npm run loop:step -- traces/<change>.jsonl <node> [when]`, with the `when` of the edge you took out of a router, eval or human node. A change that touches a product needs a trace, and `npm run check:trace` fails one the graph does not allow. Run it before you push. The trace is a record for the reviewer, not a proof, so write only what you did.

States: before you build, list every state the screen will show, the edge cases included (empty, loading, error, long content, permissions, and what changes over time), and look for information the screen would show twice. A proposal writes them in its `## States` section, as `proposals/README.md` describes, and `check:proposals` fails one that changes or adds members without them.

Scenarios: each flow's `scenarios.ts`, beside its `states` module, lists the cases a page renders, each a modeled state and the product's own data for it, such as which room or invoice, opened at `?scenario=<id>`. The Chrome checks and the screenshots open every scenario, at desktop and phone width. It is product code, not an inventory: add one for each case a change shows, such as a long name or a third room, with no proposal. Every modeled state needs at least one, and `check:state-coverage` fails a state without one.

Screenshots: at the loop's `screenshots` node, after the gate passes, run `npm run screenshots -- --config <product config> --out products/<name>/review/screenshots/<change> --base origin/main`, with `--state <state>` for each state the change touches, or no `--state` for every scenario. It takes each scenario in four views, desktop and phone, light and dark, so a full gallery with a before side is eight PNGs per scenario: keep it to the states the change touches. Commit the folder with the gallery `README.md` it writes, run the `--pin` line it prints, which points each image's link at the raw PNG at that commit, commit the `README.md` again, and put the line `--pin` prints in the pull request description, with `<sha>` replaced by the pushed commit's full SHA and its whole `https://github.com/` address, never a relative path or a branch link, so each image opens full size from the gallery on any device.

Critique: at the loop's `critique` node, right after the `screenshots` step is recorded, a second model judges the screenshots. Run `npm run critique -- --config <product config> --gallery products/<name>/review/screenshots/<change> --brief <file>`, with the brief's file outside the repository, and give the brief to a model other than the one that built the change, with the screenshots it names. In this repository, take it from the `interrogate reviewers` line of `.claude/pstack-models.md`, never your own model and never Fable, and put that model's name in the answer's `reviewer` yourself rather than trusting the critic's. Save its JSON answer, also outside the repository, and run `npm run critique -- --config <product config> --gallery <same folder> --findings <file> --trace traces/<change>.jsonl`. It refuses a trace that does not stand at `screenshots`, writes `CRITIQUE.md` into the gallery, and prints the edge and the `loop:step` line to record it with: record it before anything else, and commit `CRITIQUE.md` with the gallery, so each round's findings stay in the history. On `revise`, go back to `build`, fix each finding under Fix before review, and walk the loop again; the retake replaces `CRITIQUE.md`. A finding you judge wrong, or one whose fix needs something the inventories lack, stays unfixed: say why in the review note, and propose the missing piece as for any other build. The third critique of a run passes whatever it finds. On `pass`, carry the findings for the review note, and any left open, into the note, and put the block the last round printed in the pull request description. A change that renders nothing has no gallery: record `critique pass` and write "None, nothing renders differently." under Critique. The critique is advisory: no check reads `CRITIQUE.md`, and the trace records the step.

Every page's body is built from registered content layouts and the adapter's status parts, so a block the page needs that no content layout gives is a new content layout, which takes a proposal like any other missing piece; a page that only reuses content layouts needs none ([proposal 2026-11-13-page-bodies-from-content-layouts](proposals/2026-11-13-page-bodies-from-content-layouts.md)).

If the work needs a catalog export, layout, content layout, page type, flow state, or rule input that is not in those inventories, open a proposal, `status: open`, that lists under `changes` exactly what the inventory gains or loses, as `proposals/README.md` describes. Do not invent the missing piece, and do not edit an inventory to sneak the change through. The change itself waits for a later pull request, after the code owner has merged the proposal as `status: decided`; that pull request marks it `status: adopted`. The checks fail a proposal adopted in the pull request that adds it, with one exception: when the change only adds or only tightens, the proposal may list it under `adds` or `tightens`, with nothing under `changes`, `retires` or `opts-out`, and be adopted in the same pull request as the change. `adds` takes a new catalog export, layout, content layout or flow state by its bare name, `page-type:<id>` for a new page type with its own new `shells` entry (and its own `shells.chrome` entry, if it has one), and `task:<id>`; `tightens` takes `max_steps:<task id>` lowered, a cap lowered, `TARGET_MIN_PX` raised and `disclosed_sections:<section>` added. The code owner merges that pull request. Removals, renames, loosened rule inputs, a changed `shells` entry, other config, opt-outs and retirements keep two pull requests ([proposal 2026-11-12-right-size-governance](proposals/2026-11-12-right-size-governance.md)).

Every harness rule applies to every product. If one should not apply to a product, the proposal is an opt-out, and taking a rule out of the harness is a proposal that retires it, as `proposals/README.md` describes. Do not skip or weaken the check.

## Conventions

- Git follows home's `standards/git.md`. This repo's base branch is `main`. Change `AGENTS.md`, `CLAUDE.md` or anything in `.claude/` only with Ben's yes, as that standard says. Appending a row to `.agents/weeds.tsv` needs no yes. There is no `.cursor/` project config. Leave a Cursor config alone if one is added. The weeds log is `.agents/weeds.tsv` and the suppression baseline is `.agents/suppression-baseline.json`. Their format is home's `standards/self-correcting.md`. The model sheet is `.claude/pstack-models.md`. A change to a role's model or effort goes there, with Ben's yes. Briefs use `.claude/task-prompt.md`.
- A pull request that adds or changes a check also updates the generated script list in this file and the verify skill, `.claude/skills/verify/SKILL.md`, in the same pull request. Change the check's `.meta.ts` and run `npm run docs:gen`. `check:docs` fails a pull request that leaves them stale. Edit their hand-written parts by hand. The standing yes of 2026-11-11 covers that generated list and the verify skill.
- A rule is a pattern that holds on every page, such as section headings below the title or the main action in the first view. Never give a rule a number set per page or per page type, such as a section count. A product-wide cap that holds for every page alike, such as `MAX_DISCLOSURES_PER_PAGE`, is still a pattern. The harness README's "A pattern, not a count" states the same rule.
- Make an illegal state impossible by construction where you can: a type, a shell prop, a slot or a narrower catalog export, so the wrong page can't be written. Add a check only for what construction can't hold. [The control ladder](packages/harness/docs/how-it-works.md#the-control-ladder) orders the options from strongest down.
- When a change shows a gap in a harness check under `packages/harness/`, fix it in its own pull request. The product pull request names the gap and links that fix. Lowering a product's own rule input is not a check fix: a `tightens` proposal still adopts it in one pull request ([proposals/README.md](proposals/README.md)).

## Where the tools look

- Cursor reads this file. Its pstack is the installed Cursor plugin. The verify skill stays at `.claude/skills/verify/SKILL.md`. This repo has no `.cursor/skills/` copy of it.
- Claude reads `CLAUDE.md`, which imports this file and `.claude/pstack-models.md`. A Duet thread then follows `.claude/thread-start.md`, because a thread loads nothing in `.claude/` by itself and an `@` import does not expand. A local Claude Code session gets pstack from `.claude/settings.json`.
