---
name: verify
description: "Prove a change to agent-design-loop, a harness of design rules and failing checks around the Meridian accounts-payable app (React, Todae), on the commit it was tested at: the build gate, the illegal fixtures, then Meridian rendered in Chrome. Ends in PASS, FAIL or BLOCKED. Use before opening or pushing to a pull request, for /verify, or when asked how a change was tested."
---

# Verify an agent-design-loop change

This repository has two surfaces. The first is the harness in `packages/harness/`: the checks under `src/`, the rules and inventories they read, and the fixtures under `fixtures/` that prove each check can fail. An agent meets it as exit codes. The second is the products those rules constrain, Meridian in `products/meridian/` and Nook in `products/nook/`, which a person opens in a browser. Prove a change on the surface it touches, on the commit you will push.

Run every command from the repository root with Node 22, after `npm ci`.

## Verdicts

- `PASS`: every step the change needs ran on the tested commit and passed.
- `FAIL`: a step ran and failed. Fix the cause and run again.
- `BLOCKED`: a step could not run, so nothing proves the change either way. No Chrome, the wrong Node major, no base for `check:inventories` and uncommitted changes are all `BLOCKED`.

`BLOCKED` is not a pass. Report each blocked step as unverified in the pull request, with its reason. Never write `PASS` for a run with a blocked step the change needed.

## Doctor

Run this first, and again whenever a result looks off.

```sh
node -v                          # v22.x, as CI runs
git status --short               # empty, so the tested commit is what you push
git rev-parse HEAD               # the tested commit, for the pull request body
git rev-parse --verify origin/main || git rev-parse --verify main   # check:inventories' base without INVENTORY_BASE
npm run setup:chrome             # the chrome-headless-shell build puppeteer-core pins, into .cache/chrome
```

A wrong Node major or a dirty tree is `BLOCKED` until fixed. With neither, run `git fetch origin main`. `check:target-size` looks for Chrome at `CHROME_PATH`, then in `.cache/chrome`, then under `/usr/bin`, and with none it names each place it looked. When `setup:chrome` cannot download and there is no other Chrome, step 3 is `BLOCKED`. `/usr/bin/chromium-browser` on Ubuntu is often only a snap shim, so check that `--version` prints a version.

## Launch and drive

### 1. Build gate (every change)

```sh
npm run check:fixtures && npm run check
```

This is the command `AGENTS.md` names. CI runs the same checks split into two jobs, one per product. `check:fixtures` runs every case folder under `packages/harness/fixtures/` against the checks its `case.ts` names, on the fixture product's config (`packages/harness/fixtures/product/harness.config.ts`) with the paths the case changes. It passes only when every illegal case fails with its expected message and every legal case passes with its expected message. The legal cases are the fixture product itself, the stand-in design system in `fixtures/fake-ds/`, which shows a check reads its names from the adapter, and small products of their own, which show a rule reads its product's config and inputs. `check` then runs typecheck, ESLint and the Vitest suite on the whole repository, then `check:product` on each product's config, which runs `check:opt-outs` and every rule check in `check:rules`, then `check:proposals`, `check:retirement` and `check:loop`, which read the whole repository and take no `--config`. The Vitest suite drives Meridian with Testing Library and `user-event` in jsdom: it follows an invoice link, opens Line items, presses Approve, and requests changes with and without a reason.

Each product's rule checks end with `check:target-size`, so without Chrome `check` stops at Meridian's. Then run the rest by hand, one product at a time, and mark step 3 `BLOCKED`:

```sh
npm run typecheck && npm run lint && npm run test
for config in products/meridian/harness.config.ts products/nook/harness.config.ts; do
  for check in lint:product-ui lint:slots check:step-budget check:disclosure check:priority check:one-thing check:inventories check:state-coverage; do
    npm run "$check" -- --config "$config" || break 2
  done
done
npm run check:proposals && npm run check:retirement && npm run check:loop
```

Every rule check needs `--config`. There is no config at the repository root.

### 2. Fixture and inventory proof (a change to a check, a rule, a rule input or an inventory)

A check that passes the real app proves nothing until it can also fail. When a change adds or tightens a check, add a case folder under `packages/harness/fixtures/illegal/` in the same pull request, with a `case.ts` that names the paths it changes and the phrase the check prints. Then show both sides in the pull request: the check passing on the app (step 1) and `check:fixtures` printing `<case> <check> failed as required`. A fixture that starts passing is a `FAIL`, never a fixture to delete.

When a change loosens a check, or makes it read a product's config or inputs instead of Meridian's, add a legal case too: a folder under `packages/harness/fixtures/` with a `case.ts` that expects the check to pass, which the old check failed and the new one passes. Show `check:fixtures` printing `<case> <check> passed as required`. A legal case that starts failing is a `FAIL` too.

When a change touches an inventory (anything `proposals/README.md` lists), `check:inventories` must still print `membership matches <base sha>` for each product it touches. If membership changed, the change must graduate a proposal that is `status: decided` on `main` and lists the change under `changes`, and mark it `status: graduated`; it prints `Graduates <proposal>`. A proposal added in the same pull request covers nothing, so the proposal lands first, in its own pull request; see `proposals/README.md`. The one exception is a change that only adds members to the catalog exports, `allowed_layouts`, `allowed_content_layouts`, `allowed_page_types` or the flow states: a proposal the pull request adds as `status: graduated`, listing those members under `adds` and nothing else, covers them, and the line reads `Graduates <proposal> (only adds, …)`. Say in the pull request body that this path rests on the designer's review of the pull request ([proposal 0012](../../../proposals/0012-additions-in-one-pull-request.md)). The same holds for a rule removed from `check:rules` (a graduating proposal that lists it under `retires`) and a new opt-out (one that lists it under `opts-out`): `check:retirement` must pass.

When a change touches a reducer, a task graph or a task's `max_steps`, quote each task's `longest shipped flow route (N)` line from `check:step-budget` as well as its verdict. The check measures every route to a task's success, not only the shortest: any steps a task graph in the same flow names, then the shortest finish. A longer route over `max_steps` fails the change even when the shortest path fits, so cut the route or propose a new budget.

When a change adds or edits a proposal, `check:proposals` must pass: the front matter and the three sections are there, `adds` stands alone on a `graduated` proposal, and each status moved one step at most from the base.

### 3. Browser drive (a change to anything a product renders, its styles, its build config or the Todae version)

```sh
npm run check:target-size -- --config products/meridian/harness.config.ts
```

Use `products/nook/harness.config.ts` for Nook.

It builds the app, serves it with `vite preview` on `127.0.0.1:4173` (strict port, so stop any other preview first), and opens every modeled state at 1280 by 900 in headless Chrome, once per preview query the product's `harness.config.ts` lists for it, and opens a disclosure when the page has one. `npm run check:target-size -- --list --config products/meridian/harness.config.ts` prints those previews without Chrome. It fails any control under 24 CSS px that misses the WCAG 2.5.8 spacing exception. It closes the server and the browser itself.

To look at a Meridian change, run `npm run build && npm run preview`. It is ready when Vite prints `http://127.0.0.1:4173/`. Open the URLs in [features/](features/README.md) there, and stop the preview server you started when done.

In a Claude Duet thread there is no Chrome, and `npm run setup:chrome` cannot download one, so this step is `BLOCKED` there. Say so in the pull request, link the pull request's CI run (it runs `npm run setup:chrome` and `check:target-size`), and name the URLs a reviewer should open. The three fixture cases that measure, `target-size-whole-document`, `illegal/small-control-outside-page` and `illegal/small-control-in-closed-menu`, are `BLOCKED` with it.

### 4. Loop trace (every change, before you push)

```sh
npm run check:trace
```

It is not in `npm run check`, because the build gate runs in the middle of the design loop, before the trace ends. CI runs it after `check:loop`. It reads the change against its base like `check:inventories`, so a missing base is `BLOCKED`. A change that touches a product's directory needs a loop trace under `traces/`, written step by step with `npm run loop:step -- traces/<change>.jsonl <node> [when]`. A change that touches no product passes with `trace: the change touches no product and adds no trace`. `traces/README.md` has the format, and [proposal 0010](../../../proposals/0010-loop-trace.md) says why a trace is a record, not proof.

### What each change needs

Every row also runs step 4.

| Change | Steps |
| --- | --- |
| `products/<name>/features/`, `App.tsx`, `main.tsx`, `styles.css`, `index.html`, `vite.config.ts` | 1 and 3 |
| `products/<name>/preview/` | 1, and 3 when a view changes |
| `products/<name>/catalog/`, `layouts/`, `content-layouts/`, `page-types/`, `flows/` (the inventories, see `proposals/README.md`) | 1, 2 and 3 |
| `products/<name>/inputs`, `rules`, `harness.config.ts`, `packages/adapter-todae/`, `package.json` and `package-lock.json` (the Todae version) | 1, 2 and 3 |
| `packages/harness/` | 1 and 2. A change to a check also updates `CLAUDE.md` and this skill in the same pull request. |
| `*.test.ts(x)`, `vitest.setup.ts`, `tsconfig.json`, `eslint.config.js`, `.npmrc`, `.gitignore` | 1 |
| `proposals/` | 1, including `check:proposals`. A proposal changes nothing until it graduates. |
| `.github/` | 1, then the pull request's CI run is the rest of the proof; link it |
| `README.md`, `AGENTS.md`, `CODEOWNERS`, `docs/` folders, `products/<name>/review/`, `CLAUDE.md`, `.claude/` | 1. Review covers the rest. |

## Helpers

None. The drive is the repository's own npm scripts and Vitest journeys; [features/](features/README.md) names the command and the expected result for each feature.

## Evidence

Put the tested commit's full SHA in the pull request body, with each command and the line that gives its verdict: the `fixtures:` summary, each check's verdict line (such as `step budget: within budget.` or `inventory: membership matches <sha>.`), and the Vitest `Tests` count. For step 3, the `target size:` line. For step 4, the `trace:` line. Proof standards:

- Drive the real path: a check runs against the product as it is, and a journey goes through the rendered controls, never by calling a transition or setting state directly.
- Check the end state: the flow state the journey lands on, the check's exit code and its message, not only that nothing threw.
- A new rule is half proven until an illegal fixture fails it.

## Cleanup

Each step cleans up after itself. `npm run build` leaves `dist/`, which git ignores. Stop a `vite dev` or `vite preview` server you started; never one you didn't.
