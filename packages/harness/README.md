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

`check:fixtures` runs the harness's own tests. `fixtures/product/` is a small product with its own `harness.config.ts` that every check passes. Each folder beside it, and each one under `fixtures/illegal/`, has a `case.ts` that changes some of that config's paths and names the checks to run, with the phrase each must print. The run exits 0 only when the illegal cases fail and the legal ones pass: the fixture product, the stand-in design system in `fixtures/fake-ds/`, and small products of their own (`fixtures/two-tasks/`, `fixtures/two-collection-pages/`, `fixtures/own-sections/`) that show a rule reads its product's config and inputs, not Meridian's. `fixtures/opt-out/` and the `fixtures/illegal/opt-out-*` cases test `check:opt-outs`, the retirement threshold has Vitest tests in `src/lib/opt-outs.test.ts`, the design loop graph has them in `src/lib/loop.test.ts`, and the loop trace has them in `src/lib/trace.test.ts`. A case can also give `proposals`, a folder of proposal files that `check:inventories` reads as the pull request's new proposals when the case sets `base`. Three cases, `fixtures/target-size-whole-document/`, `fixtures/illegal/small-control-outside-page/` and `fixtures/illegal/small-control-in-closed-menu/`, build their own `index.html` and measure it, so like `check:target-size` they need Chrome. `npm run check:fixtures -- illegal/two-primaries` runs one case.

`check` is the build gate. It runs `typecheck`, `lint`, and `test` once for the whole repository, then `check:meridian` and `check:nook`, then `check:retirement` and `check:loop`. Each of the two product scripts runs `check:product` on one product's config.

| Command | What it fails |
| --- | --- |
| `npm run typecheck` | A modeled state with no exhaustive view, and ordinary type errors |
| `npm run lint` | ESLint |
| `npm run test` | The Vitest suite of every product. Meridian's covers the flow, the two-step journey, the request-changes branch, and the rendered states |

The rule checks read one product. `check:rules` lists them, in this order, and each needs `--config <file>`:

| Command | What it fails |
| --- | --- |
| `npm run lint:product-ui` | Off-catalog UI, including an import from another product's directories. Re-exports (`export ... from`), `import()`, `require()` (also as `globalThis.require` or `(0, require)`), and `import x = require()` count as imports, and so does Vite's `import.meta.glob`. A dynamic load whose specifier is not a string literal fails because it cannot be checked, and so does `require` held under another name. A loader made with `createRequire` is not read |
| `npm run lint:slots` | The primary-slot contract: a page type named in `shells.primarySlots` whose slot does not hold exactly one primary action, or a slot name the page type's shell does not define |
| `npm run check:step-budget` | A task path longer than that task's `max_steps`, a task graph and shipped reducer whose paths differ, or a task in `tasks` with no graph mapped under `flows[].tasks` in the product's `harness.config.ts`. Every task is measured. A flow state is named by its `status` field, or by `flowStatus(state)` when the graph module exports one; a state the search meets with neither fails |
| `npm run check:disclosure` | Disclosure depth or count above the cap |
| `npm run check:priority` | Per page: more than one primary action, a primary that is not the rank-1 action in `priority` (Meridian's Approve), the rank-2 action shown as primary or more than once (Meridian's Request changes), a primary inside a disclosure, or an action button whose variant is computed. Across the product: no page with the rank-1 primary, a rank-1 or rank-2 button no page reaches, or a section in `disclosed_sections` that is not behind a disclosure |
| `npm run check:one-thing` | Per page: a page rendered inside another page, a primary on a collection page, or more visible questions than the cap. Also a page type that renders no page. A product may render a page type as often as it needs. Page-type membership is `allowed_page_types`, which this check reads |
| `npm run check:inventories` | A chrome layout, content layout, or page type outside the allowlists; a collection body that is not a registered content layout; or an inventory-set change versus the pull request base that no new proposal names. A change is covered only when one new proposal names what changed as a whole word, alone or inside a path such as `layouts/side-panel/`: the member added or removed, the constant, the config field or its new value, each changed string in `flows`, `adapter.<field>` for an adapter field, the new adapter path, or the product's directory. A product the base does not have at all, such as a new one under `products/`, is such a change. A product that moved is compared with the base at its old paths, so its config path changes need a proposal. A list the base does not export yet may be recorded once. That bootstrap covered `allowed_layouts` and `allowed_content_layouts`, and it covers the design system adapter the config names. A config file the base does not have is a change, so a renamed config needs a proposal |
| `npm run check:state-coverage` | A modeled flow state with no view |
| `npm run check:target-size` | A control under WCAG 2.5.8 (24 CSS px), spacing exception included, anywhere in the document on any modeled state: the page and the chrome around it, with each closed disclosure opened on its own. It opens every state in `modeledStates`: bare, or once per query string that `flows[].previews` in the product's `harness.config.ts` lists for it. Needs Chrome; `--list` prints the previews without it. |

There is no LLM judge on CI.

Four more checks guard the rules and the loop themselves. None is in `check:rules`, and a product cannot opt out of any.

| Command | What it fails |
| --- | --- |
| `npm run check:opt-outs` | Needs `--config`. An entry in the config's `optOuts` that names a rule `check:rules` does not run, a core rule (`lint:product-ui` or `check:inventories`), or a proposal that is missing, is not directly in `paths.proposals`, is not `Status: decided`, or has no `Opts out:` line naming the rule and the product's `paths.source`. `check:product` runs it before any rule check |
| `npm run check:retirement` | Takes no flags. Reads every `harness.config.ts` git knows of outside this package, tracked or new. Fails when two configs name the same `paths.source`, when any product's opt-outs fail the rules of `check:opt-outs`, and when a majority of products, and at least two, opt out of the same rule. With two products, both must opt out |
| `npm run check:loop` | Takes no `--config`. Fails when the design loop graph in `design-loop.ts` is not one an agent can follow: a dangling edge, an unreachable node, an eval node naming a script `package.json` lacks or with no retry on `fail`, a human gate with no `CODEOWNERS` owner, or an end the run can reach without an eval node passing after the last change. Also fails when the diagram in `docs/how-it-works.md` is not the one the graph draws. `--write` redraws it |
| `npm run check:trace` | Takes no flags. Reads the change against its base, as `check:inventories` does. Fails when the change touches a product's directory and adds no loop trace under `traces/` at the repository root, and when a trace the change adds or edits does not start at the graph's `start`, steps between nodes no edge connects, gives a router, eval or human step no `when` or one its edges lack, stops anywhere but a checkpoint, or ends its run with a change to checked state that no passing eval node follows. A run paused at a checkpoint with an edge out may stop unchecked. A file under `traces/` that is not a `.jsonl` trace or the folder's README fails too. It is not in `check`, because the agent runs the gate in the middle of its walk. CI runs it after `check:loop`. `npm run loop:step -- traces/<change>.jsonl <node> [when]` appends a step and refuses one the graph does not allow. A trace is the agent's own record, so passing shows the record is a walk the graph allows, not that the work was done |

### Check one product

```sh
npm run check:product -- --config products/nook/harness.config.ts
```

`check:product` runs `check:opt-outs`, then every check in `check:rules` against that config, in the same order, and stops at the first failure. It skips a rule the config opts out of, and says so. It reads the list from `package.json`, so the two cannot drift. `npm run check:meridian` and `npm run check:nook` call it with their product's config.

A check reads its paths only from the config that `--config <file>` names. There is no config at the repository root, so a rule check run without `--config` exits with "give the product's config". Besides `--config`, `check:inventories` reads `--base <file>` and `--proposals <dir>`, which needs `--base`, and `check:target-size` reads `--list`. Any other flag, and any `--name=<value>` form, is refused, so a stale invocation cannot pass on the wrong product.

`check:target-size` builds the directory in `paths.web`, serves it with `vite preview` on port 4173, and measures every control in the document in headless Chrome, not only those inside the `[data-page]` element. It finds Chrome at `CHROME_PATH` or the usual `/usr/bin` paths.

`check:inventories` and `check:trace` compare with `INVENTORY_BASE` when it is set. CI sets it to the pull request base, or on a push to `main` to `github.event.before`, the tip of `main` before the push. Unset, it uses the merge base with `origin/main`, or with a local `main`.

## Plug a product in

A product keeps its inventories under `products/<name>/` and names them in its own `harness.config.ts`. [Meridian's config](../../products/meridian/harness.config.ts) and [Nook's config](../../products/nook/harness.config.ts) are the two working examples.

1. Put the product under `products/<name>/`: its inputs, UX rules, catalog, chrome layouts, content layouts, page types, flows, features, stylesheet, and the `index.html` that `check:target-size` builds.
2. Write `products/<name>/harness.config.ts`. Keep it plain literals, because `check:inventories` reads it at the pull request base with `git show`, where it cannot run imports. Paths in it are relative to the repository root. Type it with `satisfies HarnessConfig`, imported from `@agent-design-loop/harness`.
3. Name the design system adapter in the config's `adapter` field. A Todae product names `packages/adapter-todae/index.ts`.
4. Add a proposal under `proposals/` that names the product's directory, such as `products/nook`. The base has neither the product's config nor its inputs, so `check:inventories` reads it as a new product, and a new product needs a proposal like any other membership change. Nook's first pull request added proposal 0005.
5. Add a `check:<name>` script that runs `npm run check:product -- --config products/<name>/harness.config.ts`, and add it to `check`, as `check:meridian` and `check:nook` are.
6. Add a CI job that runs `check:product` on the config and sets `INVENTORY_BASE`, as the `nook` job in `.github/workflows/ci.yml` does.

The config has four parts, and an optional fifth. `HarnessConfig` in `src/lib/parse-config.ts` documents each field.

| Field | What it names |
| --- | --- |
| `adapter` | The design system adapter module |
| `paths` | `source`, `features`, `layouts`, `contentLayouts`, `pageTypes`, `catalog`, `inputs`, `rules`, `styles`, `app`, and `web`: where each inventory and the product UI live |
| `shells` | `primarySlots`, the page types whose shell holds one primary action, and `collections`, the page types that are collections, with their chrome slots. Every slot named must be one the shell defines as `Object.assign(Root, { ... })` |
| `flows` | Each flow's `states` and `views` modules, its `tasks` mapped to task graph modules, and its `previews` |
| `optOuts` | Optional. The harness rules this product does not follow, each mapped to the decided proposal that says why. `paths.proposals`, also optional, is the folder an opt-out's proposal must sit in, `proposals` by default. Changing it is a config path change, so `check:inventories` asks for a proposal. That check still counts proposals under `proposals/` only |

`CODEOWNERS` already asks for review on `/products/*/harness.config.ts`, `/proposals/`, `/packages/harness/`, `/packages/adapter-todae/`, and `/.github/workflows/`. Changing a config path can empty a check, so a config change needs a proposal and that review.

## Use it as a testing ground

1. Give an agent a UI task that is already in the product's inputs, such as `products/meridian/inputs/product.ts`. Do not invent a task, a layout, a content layout, or a page type in the same change.
2. The agent reads the inventories: product inputs, UX rules, the catalog, layouts, content layouts, page types, and the flow. `AGENTS.md` is only the pointer. It does not list what those inventories contain.
3. The agent runs the checks and fixes exit codes: a second primary, a raw control, a skipped state, a path over the budget, a layout, content layout, or page type that is not in the allowlist, or a collection body that is not a registered content layout.
4. What the checks cannot decide goes in the product's `review/` folder as a short note. Meridian's notes are in `products/meridian/review/`.
5. If a rule has to break, or the work needs a catalog export, layout, content layout, page type, flow state, or rule input that is not already recorded, the agent adds a file under `proposals/` with a reason, a preview, and a graduation. It does not invent the missing piece, and it does not edit the inventory to sneak the change through. The inventory check fails that membership change when no new proposal in the pull request names it.

## Proposals

A proposal is how an inventory grows. [proposals/README.md](../../proposals/README.md) lists the inventories and what a proposal file must contain.

When a human approves a proposal, a change graduates it into the inventory data and the checks: the catalog, a layout, a content layout, a page-type shell, the flow model, or the product inputs. The next run is constrained by that change. The inventory check accepts that change in the same pull request as the proposal, so a reviewer decides whether it should have waited. A proposal can also record a decision that lands with its own pull request, as [proposal 0003](../../proposals/0003-two-step-approve.md) through [proposal 0006](../../proposals/0006-move-into-packages.md) do.

## Rules apply to every product

A rule is a check that `check:rules` runs. An approved pattern graduates straight into the harness as one of those, so it applies to every product from the pull request that adds it. A product that should not follow a rule opts out with a decided proposal, and a rule most products opt out of is flagged for retirement, so the harness can shrink as well as grow. [How a pattern becomes a rule](docs/how-it-works.md#how-a-pattern-becomes-a-rule) walks the lifecycle, and [proposals/README.md](../../proposals/README.md#opting-a-product-out-of-a-rule) gives the opt-out format.

## The design system adapter

The checks hold no design system names of their own. They read them from the adapter module the product's config names: the design system's packages, its action control and which variant is primary, its disclosure, its question part, the status pieces a page shell may hold, and the tokens behind the action control's size. `DesignSystemAdapter` in `src/lib/adapter.ts` is the type.

Todae's adapter is its own package, [`@agent-design-loop/adapter-todae`](../adapter-todae/index.ts), at `packages/adapter-todae/index.ts`. It names `Button.Root`, `Disclosure.Root`, `Disclosure.Summary`, and `Field.Root`. Like the config, it stays plain literals, and a change to it needs a proposal. `fixtures/fake-ds/` is a stand-in design system with its own adapter, and the checks must pass it.

## The package entry

A product imports the harness by its package name, `@agent-design-loop/harness`. The root `package.json` declares `packages/*` as npm workspaces. `index.ts` exports:

- `HarnessConfig`, `ShellRules`, and `FlowConfig`, the config types a product's `harness.config.ts` satisfies
- `DesignSystemAdapter`, the type an adapter satisfies
- `shortestPath`, `eventEdges`, and `TaskEdge`, the path search a product's task graphs use

It exports only types from the adapter module, because loading that module runs a check's config read.
