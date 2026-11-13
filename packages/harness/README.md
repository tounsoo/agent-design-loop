# @agent-design-loop/harness

The harness is the checks that hold an agent's UI work to rules a product keeps in the repo as data. Each check reads one product's inventories from that product's `harness.config.ts` and exits non-zero when the UI breaks a rule. The harness also holds its own tests, in `fixtures/`, and the page [How this design loop works](docs/how-it-works.md), which explains the control ladder, each check, and when a proposal is required.

| Path | What it is |
| --- | --- |
| `src/` | One file per check, run as an npm script from the repository root |
| `src/lib/` | What the checks share: config loading (`config.ts`), the config types and parser (`parse-config.ts`), the adapter, page scope, and path search |
| `fixtures/` | The harness's own tests: a fixture product, legal cases, and known-bad shapes in `fixtures/illegal/` |
| `index.ts` | The package entry, `@agent-design-loop/harness` |
| `docs/how-it-works.md` | The walkthrough |

Two products use it in this repository: [Meridian](../../products/meridian/README.md), an accounts-payable workspace, and Nook, a room booking app under `products/nook/`.

## Run the checks

```sh
npm run check:fixtures && npm run check
```

`check:fixtures` runs the harness's own tests: `fixtures/product/` is a small product that every check passes, and each folder beside it, or under `fixtures/illegal/`, is a case with a `case.ts` that changes some of that config and names the checks to run, with the phrase each must print. `check` is the build gate. [The check reference](docs/checks.md) says what it runs, in order, and for each script what it fails, the flags it reads, whether it compares with the base or opens Chrome, and the fixture cases that prove it. `npm run docs:gen` writes the reference from the code and from each script's `src/<script>.meta.ts`, and `npm run check:docs`, part of `check`, fails when it or a copy below is stale.

| Command | What it fails |
| --- | --- |
| `npm run typecheck` | A modeled state with no exhaustive view, and ordinary type errors |
| `npm run lint` | ESLint |
| `npm run test` | The Vitest suite of every product. Meridian's covers the flow, the two-step journey, the request-changes branch, and the rendered states |

The harness's own scripts, written by `npm run docs:gen`:

<!-- docs:gen scripts start -->
| Script | Kind | What it is for |
| --- | --- | --- |
| [`npm run lint:product-ui`](docs/checks.md#lintproduct-ui) | Rule | Product UI is built only from the product's catalog: no raw controls, no inline styles, no other component kit, nothing from another product. |
| [`npm run lint:slots`](docs/checks.md#lintslots) | Rule | Each page type with a primary slot holds its page's one primary action there. |
| [`npm run check:step-budget`](docs/checks.md#checkstep-budget) | Rule | Every route that finishes a task, not only the shortest, fits that task's `max_steps`, in the task graph and in the shipped reducer. |
| [`npm run check:disclosure`](docs/checks.md#checkdisclosure) | Rule | Each page holds at most `MAX_DISCLOSURES_PER_PAGE` disclosures, nested at most `MAX_DISCLOSURE_DEPTH` deep. |
| [`npm run check:priority`](docs/checks.md#checkpriority) | Rule | Each page holds at most one primary action, and it is the product's rank-1 action; the rank-2 action is secondary; `disclosed_sections` stay behind disclosures. |
| [`npm run check:one-thing`](docs/checks.md#checkone-thing) | Rule | One job per page: no page inside a page, no primary on a collection or content page, and at most `MAX_VISIBLE_QUESTIONS` questions outside a disclosure. |
| [`npm run check:inventories`](docs/checks.md#checkinventories) | Rule | Inventory membership changes only by adopting a proposal, and each inventory's folders, barrels and uses match its list. |
| [`npm run check:state-coverage`](docs/checks.md#checkstate-coverage) | Rule | Every modeled flow state has a view and a scenario. |
| [`npm run check:target-size`](docs/checks.md#checktarget-size) | Rule | Every control on every scenario, at desktop and phone width, is at least 24 CSS px, or meets the WCAG 2.5.8 spacing exception, measured in headless Chrome. |
| [`npm run check:accessible-names`](docs/checks.md#checkaccessible-names) | Rule | On every scenario, what a screen reader hears matches the flow's `accessible-names.ts`, and every press either announces what changed or moves focus. |
| [`npm run check:rendered-page`](docs/checks.md#checkrendered-page) | Rule | Every scenario, as Chrome paints it at desktop and phone width: one h1 per page and no skipped heading level, the rank-1 action in the first view, disclosures closed unless the state opens them, AA contrast in light and dark, and no sideways scroll on a phone. |
| [`npm run check:opt-outs`](docs/checks.md#checkopt-outs) | Product | Every opt-out in a product's config stands on an adopted proposal that names the rule and the product. |
| [`npm run check:products`](docs/checks.md#checkproducts) | Repository | Runs `check:product` on every product the registry finds, one after another, so a new product needs no script or CI job of its own. |
| [`npm run check:proposals`](docs/checks.md#checkproposals) | Repository | Every proposal has its fields and sections, a new one has a dated name, and each status moves one step at a time from the base. |
| [`npm run check:retirement`](docs/checks.md#checkretirement) | Repository | A rule most products opt out of is flagged for retirement, and a rule leaves `check:rules`, or a product opts out, only by adopting a proposal. |
| [`npm run check:loop`](docs/checks.md#checkloop) | Repository | The design loop graph in `packages/harness/design-loop.ts` is one an agent can follow, and the diagram in `how-it-works.md` is the one it draws. |
| [`npm run check:docs`](docs/checks.md#checkdocs) | Repository | The check reference and the docs that copy it are the ones the code writes, and the verify map covers every page type, layout, content layout, task and scenario of every product: `npm run docs:gen` rewrites the generated parts. |
| [`npm run check:fixtures`](docs/checks.md#checkfixtures) | Repository | The harness's own tests: every illegal fixture case fails with its expected message, and every legal case passes with its. |
| [`npm run check:product`](docs/checks.md#checkproduct) | Product | Runs `check:opt-outs`, then every rule check in `check:rules`, on one product, skipping a rule the product opts out of. |
| [`npm run check:trace`](docs/checks.md#checktrace) | Repository | A change that touches a product carries a loop trace, and every trace it adds or edits is a walk the design loop graph allowed when each step was recorded. |
| [`npm run critique`](docs/checks.md#critique) | Tool | The design loop's `critique` step: writes the brief for a second model to judge the screenshots, then records its findings and the edge back to build or on to the note. |
| [`npm run loop:step`](docs/checks.md#loopstep) | Tool | Appends one step to a change's loop trace, and refuses a step the design loop graph does not allow. |
| [`npm run new:product`](docs/checks.md#newproduct) | Tool | Starts a product: copies the harness's fixture product, which passes every check, to `products/<name>/` and points its config there. |
| [`npm run screenshots`](docs/checks.md#screenshots) | Tool | The design loop's `screenshots` step: captures each scenario in four views, before and after a change, into a gallery the pull request links. |
| [`npm run setup:chrome`](docs/checks.md#setupchrome) | Tool | Installs the chrome-headless-shell build `puppeteer-core` pins into `.cache/chrome`, where the Chrome checks look for it. |
<!-- docs:gen scripts end -->

There is no LLM judge on CI.

### Check one product

```sh
npm run check:product -- --config products/nook/harness.config.ts
```

A check reads its paths only from the config that `--config <file>` names. There is no config at the repository root, so a rule check run without `--config` exits with "give the product's config". A flag the script's meta does not list, and any `--name=<value>` form, is refused, so a stale invocation cannot pass on the wrong product.

### Add a check

Before you write one, check that it is the right kind of rule.

- **A pattern, not a count.** A rule says something that holds on every page, such as one h1 per page with no skipped heading level, or the rank-1 action in the first view. It never sets a number per page or per page type, such as a section count, because then every page needs its own check. A number a rule does need, like a contrast ratio or a product-wide cap such as `MAX_DISCLOSURES_PER_PAGE`, holds for every page alike.
- **Construction first.** If a type, a shell prop, a slot or a narrower catalog export can make the illegal state impossible to write, do that instead of a check. [The control ladder](docs/how-it-works.md#the-control-ladder) orders the options from strongest down. A check covers only what construction can't hold.
- **Its own pull request.** A gap in a check found while building a product is fixed at its root cause in a pull request of its own, not bolted onto the product's pull request. The product pull request names the gap and links that fix. Lowering a product's own rule input is not a check fix: a `tightens` proposal still adopts it in one pull request.

1. Write the script as `packages/harness/src/<name>.ts`, and load the product's config through `lib/config.ts` if it reads one.
2. Beside it, write `packages/harness/src/<name>.meta.ts`, which exports `meta` typed `satisfies CheckMeta` from [`lib/check-meta.ts`](src/lib/check-meta.ts): a one-sentence summary, the flags it reads besides `--config`, what it fails, and how it works. A helper the gate does not run says `tool: true` and lists no failures.
3. Add its npm script to `package.json`, and to `check:rules` if every product must pass it.
4. Add fixture cases under `fixtures/`: an illegal case it fails and a legal case it passes.
5. Run `npm run docs:gen`. It writes the reference, the table above, and the generated parts of `CLAUDE.md`, the verify skill and its map's index. `npm run check:docs` fails when a script has no meta, a meta has no script, a generated doc is stale, or the verify map misses a page type, layout, content layout, task or scenario of a product.

## Plug a product in

A product keeps its inventories under `products/<name>/` and names them in its own `harness.config.ts`. [Meridian's config](../../products/meridian/harness.config.ts) and [Nook's config](../../products/nook/harness.config.ts) are the two working examples.

1. Put the product under `products/<name>/`: its inputs, UX rules, catalog, chrome layouts, content layouts, page types, flows, features, stylesheet, and the `index.html` that `check:target-size`, `check:accessible-names` and `check:rendered-page` build. Beside each flow's `states` module, a `scenarios.ts` lists the cases its pages render, each a modeled state and the product's own data, opened at `?scenario=<id>`; the app reads it with `readScenario` from `@agent-design-loop/harness/scenarios`. Beside each flow's `views` module, an `accessible-names.ts` says what a screen reader hears on each scenario.
2. Write `products/<name>/harness.config.ts`. Keep it plain literals, because `check:inventories` reads it at the pull request base with `git show`, where it cannot run imports. Paths in it are relative to the repository root. Type it with `satisfies HarnessConfig`, imported from `@agent-design-loop/harness`.
3. Name the design system adapter in the config's `adapter` field. A Todae product names `packages/adapter-todae/index.ts`.
4. First merge a proposal under `proposals/` that lists the product's directory under `changes`, such as `products/nook`, and get it approved as `status: decided`. The pull request that adds the product marks it `status: adopted`. The base has neither the product's config nor its inputs, so `check:inventories` reads it as a new product, and a new product needs an adopted proposal like any other membership change. Nook's first pull request added proposal 0005, before a proposal had to be decided first.

Nothing else names the product: `npm run check`, `check:retirement` and CI find it by its config. `npm run new:product -- <name>` does steps 1 to 3 by copying `fixtures/product/`, which passes every check, to `products/<name>/` and pointing its paths at the new folder. Step 4 is still yours.

The config has four parts, and an optional fifth. `HarnessConfig` in `src/lib/parse-config.ts` documents each field.

| Field | What it names |
| --- | --- |
| `adapter` | The design system adapter module |
| `paths` | `source`, `features`, `layouts`, `contentLayouts`, `pageTypes`, `catalog`, `inputs`, `rules`, `styles`, `app`, and `web`: where each inventory and the product UI live |
| `shells` | `primarySlots`, the page types whose shell holds one primary action, `collections`, the page types that are collections, with their chrome slots, and, optionally, `content`, the page types that show information and hold no primary button outside the shared chrome layouts, such as a help or policy page, and `chrome`, the slots of a primary-slot or content page type that are chrome rather than body. Every other slot is body, built only from registered content layouts and the adapter's status parts. Every allowed page type is in exactly one of them. Every slot named must be one the shell defines as `Object.assign(Root, { ... })` |
| `flows` | Each flow's `states` and `views` modules and its `tasks` mapped to task graph modules. Its scenarios sit in `scenarios.ts` beside the `states` module, by convention, not in the config |
| `optOuts` | Optional. The harness rules this product does not follow, each mapped to the decided proposal that says why. `paths.proposals`, also optional, is the folder an opt-out's proposal must sit in, `proposals` by default. Changing it is a config path change, so `check:inventories` asks for a proposal, and that check reads proposals from this folder |

`CODEOWNERS` already asks for review on `/products/*/harness.config.ts`, `/proposals/` and any other folder named `proposals`, `/packages/harness/`, `/packages/adapter-todae/`, and `/.github/workflows/`. Changing a config path can empty a check, so a config change needs a proposal and that review.

## Use it as a testing ground

1. Give an agent a UI task that is already in the product's inputs, such as `products/meridian/inputs/product.ts`. Do not invent a task, a layout, a content layout, or a page type in the same change.
2. The agent reads the inventories: product inputs, UX rules, the catalog, layouts, content layouts, page types, and the flow. `AGENTS.md` is only the pointer. It does not list what those inventories contain.
3. The agent runs the checks and fixes exit codes: a second primary, a raw control, a skipped state, a path over the budget, a layout, content layout, or page type that is not in the allowlist, or a page body that is not built from registered content layouts.
4. Once the checks pass, the agent captures each state the change touches with `npm run screenshots`, into `products/<name>/review/screenshots/<change>/` with a gallery `README.md`, commits it, pins each image's link to its raw file at that commit with `--pin`, and links the gallery from the pull request. [Screenshots](docs/how-it-works.md#screenshots) has the command.
5. A second model, not the one that built the change, critiques the screenshots against four patterns that hold on any page, through `npm run critique`. A finding that matters sends the work back to build, at most twice. The findings go in the gallery as `CRITIQUE.md` and in the pull request. [The critique](docs/how-it-works.md#the-critique) has the commands.
6. What the checks and the critique leave open go in the product's `review/` folder as a short note. Meridian's notes are in `products/meridian/review/`.
7. If a rule has to break, or the work needs a catalog export, layout, content layout, page type, flow state, or rule input that is not already recorded, the agent adds a file under `proposals/` with a reason, a preview, and an adoption. It does not invent the missing piece, and it does not edit the inventory to sneak the change through. The inventory check fails that membership change until the code owner has merged the proposal on main, as `status: decided`, and the change marks it `status: adopted`. A change that only adds (a catalog export, layout, content layout, flow state, page type with its own `shells` entry or task) or only tightens a rule input may instead adopt a proposal it adds, listing it under `adds` or `tightens`, in the one pull request the code owner merges.

## Proposals

A proposal is how an inventory grows. [proposals/README.md](../../proposals/README.md) lists the inventories and what a proposal file must contain.

A proposal is approved when the code owner merges the pull request that moves it to `status: decided`. A later change adopts it into the inventory data and the checks: the catalog, a layout, a content layout, a page-type shell, the flow model, or the product inputs, and marks it `status: adopted`. The next run is constrained by that change. The inventory check reads the decided proposal from the base, so it refuses a change that adopts the proposal its own pull request adds, except an addition or a tightening whose proposal lists only `adds` or `tightens` ([proposal 0012](../../proposals/0012-additions-in-one-pull-request.md), [proposal 2026-11-12-right-size-governance](../../proposals/2026-11-12-right-size-governance.md)). A proposal that changes no inventory, such as [proposal 0011](../../proposals/0011-proposal-fields-and-graduation.md), may start as `adopted`.

## Rules apply to every product

A rule is a check that `check:rules` runs. An approved pattern is adopted straight into the harness as one of those, so it applies to every product from the pull request that adds it. A product that should not follow a rule opts out by adopting a decided proposal, a rule leaves `check:rules` only by adopting one that retires it, and a rule most products opt out of is flagged for retirement, so the harness can shrink as well as grow. [How a pattern becomes a rule](docs/how-it-works.md#how-a-pattern-becomes-a-rule) walks the lifecycle, and [proposals/README.md](../../proposals/README.md#opting-a-product-out-of-a-rule) gives the opt-out format.

## The design system adapter

The checks hold no design system names of their own. They read them from the adapter module the product's config names: the design system's packages, its action control and which variant is primary, its disclosure, its question part, the status pieces a page shell may hold, and the tokens behind the action control's size. `DesignSystemAdapter` in `src/lib/adapter.ts` is the type.

Todae's adapter is its own package, [`@agent-design-loop/adapter-todae`](../adapter-todae/index.ts), at `packages/adapter-todae/index.ts`. It names `Button.Root`, `Disclosure.Root`, `Disclosure.Summary`, and `Field.Root`. Like the config, it stays plain literals, and a change to it needs a proposal. `fixtures/fake-ds/` is a stand-in design system with its own adapter, and the checks must pass it.

## The package entry

A product imports the harness by its package name, `@agent-design-loop/harness`. The root `package.json` declares `packages/*` as npm workspaces. `index.ts` exports:

- `HarnessConfig`, `ShellRules`, and `FlowConfig`, the config types a product's `harness.config.ts` satisfies
- `DesignSystemAdapter`, the type an adapter satisfies
- `shortestPath`, `eventEdges`, and `TaskEdge`, the path search a product's task graphs use, and `measureRoutes`, which measures every route to a task's success against its budget

It exports only types from the adapter module, because loading that module runs a check's config read.
