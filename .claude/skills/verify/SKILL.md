---
name: verify
description: "Prove a change to agent-design-loop, a harness of design rules and failing checks around two demo products, Meridian (accounts payable) and Nook (room booking), built with React and Todae, on the commit it was tested at: the build gate, the illegal fixtures, then the products rendered in Chrome. Ends in PASS, FAIL or BLOCKED. Use before opening or pushing to a pull request, for /verify, or when asked how a change was tested."
---

# Verify an agent-design-loop change

This repository has two surfaces. The first is the harness in `packages/harness/`: the checks under `src/`, the rules and inventories they read, and the fixtures under `fixtures/` that prove each check can fail. An agent meets it as exit codes. The second is the products those rules constrain, Meridian in `products/meridian/` and Nook in `products/nook/`, which a person opens in a browser. Prove a change on the surface it touches, on the commit you will push.

Run every command from the repository root with Node 22, after `npm ci`.

## Verdicts

- `PASS`: every step the change needs ran on the tested commit and passed.
- `FAIL`: a step ran and failed. Fix the cause and run again.
- `BLOCKED`: a step could not run, so nothing proves the change either way. No Chrome, the wrong Node major, no base for a check that compares with one and uncommitted changes are all `BLOCKED`.

`BLOCKED` is not a pass. Report each blocked step as unverified in the pull request, with its reason. Never write `PASS` for a run with a blocked step the change needed.

## Doctor

Run this first, and again whenever a result looks off.

```sh
node -v                          # v22.x, as CI runs
git status --short               # empty, so the tested commit is what you push
git rev-parse HEAD               # the tested commit, for the pull request body
git rev-parse --verify origin/main || git rev-parse --verify main   # the base, without INVENTORY_BASE, for the checks that compare with one
npm run setup:chrome             # the chrome-headless-shell build puppeteer-core pins, into .cache/chrome
```

A wrong Node major or a dirty tree is `BLOCKED` until fixed. With no base, run `git fetch origin main`.

<!-- docs:gen blockers start -->
Without a Chrome that starts, `check:target-size` and `check:accessible-names` are `BLOCKED`, and so are `screenshots` and the 13 fixture cases that open a page: `announced-progress`, `announced-sort`, `announced-waitlist`, `listed-press-gap`, `target-size-whole-document`, `illegal/silent-waitlist-leave`, `illegal/small-control-in-closed-menu`, `illegal/small-control-outside-page`, `illegal/stale-press-gap`, `illegal/step-read-as-in-progress`, `illegal/undeclared-current-step`, `illegal/unnamed-control` and `illegal/waitlist-row-loses-focus`. Without a base, `check:inventories`, `check:proposals`, `check:retirement` and `check:trace` are `BLOCKED`.
<!-- docs:gen blockers end -->

The Chrome checks look for Chrome where [the check reference](../../../packages/harness/docs/checks.md#the-build-gate) says, and with none they name each place they looked. When `setup:chrome` cannot download and there is no other Chrome, step 3 is `BLOCKED`. `/usr/bin/chromium-browser` on Ubuntu is often only a snap shim, so check that `--version` prints a version.

## Launch and drive

### 1. Build gate (every change)

```sh
npm run check:fixtures && npm run check
```

This is the command `AGENTS.md` names. CI runs the same checks in two jobs: one runs the fixtures, the repository-wide checks, Meridian's product checks and `check:trace`, and the other runs Nook's product checks. `check:fixtures` runs every case folder under `packages/harness/fixtures/` against the checks its `case.ts` names, and passes only when every illegal case fails with its expected message and every legal case passes with its expected message. `check` then runs typecheck, ESLint and the Vitest suite on the whole repository, `check:product` on each product's config, and the repository checks; [the check reference](../../../packages/harness/docs/checks.md#the-build-gate) lists them in order and says what each fails. The Vitest suite drives Meridian with Testing Library and `user-event` in jsdom: it follows an invoice link, opens Line items and presses Approve, approves again with Line items closed, and requests changes with and without a reason.

Each product's rule checks end with `check:target-size` and `check:accessible-names`, so without Chrome `check` stops at Meridian's. Then run the rest by hand, one product at a time, and mark step 3 `BLOCKED`:

<!-- docs:gen no-chrome start -->
```sh
npm run typecheck && npm run lint && npm run test
for config in products/meridian/harness.config.ts products/nook/harness.config.ts; do
  for check in check:opt-outs lint:product-ui lint:slots check:step-budget check:disclosure check:priority check:one-thing check:inventories check:state-coverage; do
    npm run "$check" -- --config "$config" || break 2
  done
done
npm run check:proposals && npm run check:retirement && npm run check:loop && npm run check:docs
```
<!-- docs:gen no-chrome end -->

Every rule check needs `--config`. There is no config at the repository root.

### 2. Fixture and inventory proof (a change to a check, a rule, a rule input or an inventory)

A check that passes the real app proves nothing until it can also fail. When a change adds or tightens a check, add a case folder under `packages/harness/fixtures/illegal/` in the same pull request, with a `case.ts` that names the paths it changes and the phrase the check prints. Then show both sides in the pull request: the check passing on the app (step 1) and `check:fixtures` printing `<case> <check> failed as required`. A fixture that starts passing is a `FAIL`, never a fixture to delete.

When a change loosens a check, or makes it read a product's config or inputs instead of Meridian's, add a legal case too: a folder under `packages/harness/fixtures/` with a `case.ts` that expects the check to pass, which the old check failed and the new one passes. Show `check:fixtures` printing `<case> <check> passed as required`. A legal case that starts failing is a `FAIL` too.

When a change touches an inventory (anything `proposals/README.md` lists), `check:inventories` must still print `membership matches <base sha>` for each product it touches, or `base has no …; recorded the current inventories` when the base lacks a list it may record once, or `recorded a new product's inventories` for a product the base does not have. If membership changed, the change must adopt a proposal, and the line reads `Adopts <proposal>`. A proposal added in the same pull request covers nothing but an addition, so otherwise the proposal lands first, in its own pull request; see `proposals/README.md`. An addition reads `Adopts <proposal> (only adds, …)`: say in the pull request body that this path rests on the designer's review of the pull request ([proposal 0012](../../../proposals/0012-additions-in-one-pull-request.md)). [Its reference entry](../../../packages/harness/docs/checks.md#checkinventories) says which proposal covers which change, which base it compares with, and how it reads a list. A rule removed from `check:rules` or a new opt-out needs an adopted proposal too, and `check:retirement` must pass.

When a change touches a reducer, a task graph or a task's `max_steps`, quote each task's `longest shipped flow route (N)` line from `check:step-budget` as well as its verdict. The check measures every route to a task's success, not only the shortest: any steps a task graph in the same flow names, then the shortest finish. A longer route over `max_steps` fails the change even when the shortest path fits, so cut the route or propose a new budget.

When a change adds or edits a proposal, `check:proposals` must pass. [Its reference entry](../../../packages/harness/docs/checks.md#checkproposals) lists what it fails, such as a new proposal not named for the UTC day it was written and a lowercase slug, `2026-11-12-side-panel.md`. Its rules are proven by the Vitest suite in `packages/harness/src/lib/proposals.test.ts`, not by fixture cases, because the check reads the repository's own proposal folders and takes no `--config`.

### 3. Browser drive (a change to anything a product renders, its styles, its build config or the Todae version)

```sh
npm run check:target-size -- --config products/meridian/harness.config.ts
npm run check:accessible-names -- --config products/meridian/harness.config.ts
```

Use `products/nook/harness.config.ts` for Nook.

Before building, list the screen's states, the edge cases included, and look for information it would show twice; a proposal keeps that list in `## States` (`proposals/README.md`). Once built, open each state the list names, out-of-scope ones aside, and check that the screen shows what its line says and says nothing twice. Name any state you could not open in the pull request.

`check:target-size` builds and serves the app and opens every modeled state at 1280 by 900 in headless Chrome, once per preview the product's `harness.config.ts` lists for it, so stop any other `vite preview` on its port first. `npm run check:target-size -- --list --config products/meridian/harness.config.ts` prints those previews without Chrome. [Its reference entry](../../../packages/harness/docs/checks.md#checktarget-size) says what it fails. It closes the server and the browser itself.

`check:accessible-names` opens the same previews, reads what a screen reader hears on each, and presses every action; [its reference entry](../../../packages/harness/docs/checks.md#checkaccessible-names) says what it fails. Its last line counts the presses, and how many of them have problems the flows list in `knownGaps`. When a change alters what a state says, change the flow's `accessible-names.ts` in the same pull request, and say in the pull request what each changed state now announces, so a reviewer can judge the words. When a change fixes a listed gap, the check fails until its entry comes off `knownGaps`; when it adds a press problem, fix it rather than list it, unless the fix belongs in its own pull request, and then say so in the pull request. `--list` checks the file against the previews without Chrome.

To look at a Meridian change, run `npm run build && npm run preview`. It is ready when Vite prints `http://127.0.0.1:4173/`. Open the URLs in [features/](features/README.md) there, and stop the preview server you started when done.

A Claude Duet thread runs this step too: `npm run setup:chrome` downloads chrome-headless-shell into `.cache/chrome` there, and `check:target-size` and `check:accessible-names` run in it. The step is `BLOCKED` only when no Chrome that starts is found: `setup:chrome` cannot download one or has no build for the platform, there is no other Chrome, or the one found does not start. Then say so in the pull request, link the pull request's CI run (it runs `npm run setup:chrome`, `check:target-size` and `check:accessible-names`), and name the URLs a reviewer should open. The fixture cases that open a page are `BLOCKED` with it, as the Doctor's list says.

#### Screenshots (the same changes, once step 3 passes)

The design loop's `screenshots` node comes after the gate passes. Capture every state the change touches, before and after, in the product's `review/screenshots/` folder, named like the change's trace:

```sh
npm run screenshots -- --config products/meridian/harness.config.ts \
  --out products/meridian/review/screenshots/<change> --base origin/main --state <state>
```

Repeat `--state` for each state the change touches, or leave it out for every preview. It takes every preview of each state, so one state can give several shots. Each run replaces the whole folder, so a retake repeats every flag. It opens the previews `check:target-size` opens, at 1280 by 900 in the same Chrome, so it is `BLOCKED` when step 3 is. It writes `before/` and `after/` PNGs and a gallery `README.md` whose images each link to their own file. Look at the PNGs yourself before you commit them: a blank or half-loaded screen is a `FAIL`. Commit the folder, then run the `--pin` line the script prints:

```sh
npm run screenshots -- --config products/meridian/harness.config.ts \
  --pin products/meridian/review/screenshots/<change>
```

It points each image's link at the raw PNG at that commit, so a click opens the image itself, full size on a phone too, and refuses a folder with anything but its `README.md` uncommitted. Commit the `README.md` again, push, and put the line `--pin` prints in the pull request description with `<sha>` replaced by the pushed commit's full SHA. A retake writes an unpinned gallery, so pin again after each one. Keep its whole `https://github.com/` address: a relative path breaks in the GitHub app and in email, and a branch link breaks once the branch is deleted. Then open the gallery link from the pull request page, in a browser that isn't signed in to GitHub when the repository is public, and click one image: every image must show, and the click must open the PNG itself, at a `raw.githubusercontent.com` address with the commit's SHA, not GitHub's page for the file. Images in the description itself don't come through from an agent, so the description holds the link and no image.

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
| `packages/harness/` | 1 and 2. A change to a check updates its `.meta.ts` and runs `npm run docs:gen`, which rewrites `packages/harness/docs/checks.md` and the generated parts of `packages/harness/README.md`, `CLAUDE.md` and this skill; update their hand-written parts by hand. |
| `*.test.ts(x)`, `vitest.setup.ts`, `tsconfig.json`, `eslint.config.js`, `.npmrc`, `.gitignore` | 1 |
| `proposals/` | 1, including `check:proposals`. A proposal changes nothing until it is adopted. |
| `.github/` | 1, then the pull request's CI run is the rest of the proof; link it |
| `README.md`, `AGENTS.md`, `CODEOWNERS`, `docs/` folders, `products/<name>/review/`, `CLAUDE.md`, `.claude/` | 1. Review covers the rest. |

## Helpers

`npm run screenshots`, above, is the one helper; it is not a check and nothing fails without it. The drive is the repository's own npm scripts and Vitest journeys; [features/](features/README.md) names the command and the expected result for each feature.

## Evidence

Put the tested commit's full SHA in the pull request body, with each command and the line that gives its verdict: the `fixtures:` summary, each check's verdict line (such as `step budget: within budget.`, `inventory: membership matches <sha>.` or `docs: … as the code has them.`), and the Vitest `Tests` count. For step 3, the `target size:` and `accessible names:` lines, and the gallery link from the screenshots. For step 4, the `trace:` line. Proof standards:

- Drive the real path: a check runs against the product as it is, and a journey goes through the rendered controls, never by calling a transition or setting state directly.
- Check the end state: the flow state the journey lands on, the check's exit code and its message, not only that nothing threw.
- A new rule is half proven until an illegal fixture fails it.

## Cleanup

Each step cleans up after itself. `npm run build` leaves `dist/`, which git ignores. Stop a `vite dev` or `vite preview` server you started; never one you didn't.
