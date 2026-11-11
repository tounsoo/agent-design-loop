---
name: verify
description: "Prove a change to agent-design-loop, a harness of design rules and failing checks around the Meridian accounts-payable app (React, Todae), on the commit it was tested at: the build gate, the illegal fixtures, then Meridian rendered in Chrome. Ends in PASS, FAIL or BLOCKED. Use before opening or pushing to a pull request, for /verify, or when asked how a change was tested."
---

# Verify an agent-design-loop change

This repository has two surfaces. The first is the harness: the checks under `scripts/`, the rules and inventories they read, and the illegal fixtures that prove each check can fail. An agent meets it as exit codes. The second is Meridian, the app those rules constrain, which a person opens in a browser. Prove a change on the surface it touches, on the commit you will push.

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
echo "${CHROME_PATH:-unset}"; ls /usr/bin/google-chrome* /usr/bin/chromium* 2>/dev/null
```

A wrong Node major or a dirty tree is `BLOCKED` until fixed. With neither, run `git fetch origin main`. Without a Chrome binary, step 3 is `BLOCKED`. `/usr/bin/chromium-browser` on Ubuntu is often only a snap shim, so check that `--version` prints a version.

## Launch and drive

### 1. Build gate (every change)

```sh
npm run check:fixtures && npm run check
```

This is the command CI runs and the one `AGENTS.md` names. `check:fixtures` runs each case listed in `scripts/check-fixtures.ts` against its check. It passes only when every illegal case fails with its expected message and every legal case passes with its expected message. The legal cases are the stand-in design system in `fixtures/fake-ds/`, which shows a check reads its names from the adapter, and small products of their own run with `--config`, which show a rule reads its product's config and inputs. `check` then runs typecheck, lint, the rule checks and the Vitest suite against the real app. The Vitest suite drives Meridian with Testing Library and `user-event` in jsdom: it follows an invoice link, opens Line items, presses Approve, and requests changes with and without a reason.

`check` ends with `check:target-size` before `test`, so without Chrome it stops there. Then run the rest by hand and mark step 3 `BLOCKED`:

```sh
npm run typecheck && npm run lint && npm run check:step-budget && npm run check:disclosure \
  && npm run check:priority && npm run check:one-thing && npm run check:inventories \
  && npm run check:state-coverage && npm run test
```

### 2. Fixture and inventory proof (a change to a check, a rule, a rule input or an inventory)

A check that passes the real app proves nothing until it can also fail. When a change adds or tightens a check, add a case under `fixtures/illegal/` and a row in `scripts/check-fixtures.ts` in the same pull request, with the phrase the check prints. Then show both sides in the pull request: the check passing on the app (step 1) and `check:fixtures` printing `<case> failed the check as required`. A fixture that starts passing is a `FAIL`, never a fixture to delete.

When a change loosens a check, or makes it read a product's config or inputs instead of Meridian's, add a legal case too: a row in the legal list of `scripts/check-fixtures.ts`, with a folder under `fixtures/` (or a `--config` of its own) that the old check failed and the new one passes. Show `check:fixtures` printing `<case> passed the check as required`. A legal case that starts failing is a `FAIL` too.

When a change touches an inventory (anything `proposals/README.md` lists), `check:inventories` must still print `membership matches <base sha>`. If membership changed, the pull request needs a new file under `proposals/`; see `proposals/README.md`.

### 3. Browser drive (a change to anything Meridian renders, its styles, its build config or the Todae version)

```sh
CHROME_PATH=/path/to/chrome npm run check:target-size
```

It builds the app, serves it with `vite preview` on `127.0.0.1:4173` (strict port, so stop any other preview first), and opens every modeled state at 1280 by 900 in headless Chrome, with the detail page's Line items open. It fails any invoice control under 24 CSS px that misses the WCAG 2.5.8 spacing exception. It closes the server and the browser itself.

To look at a change, run `npm run build && npm run preview`. It is ready when Vite prints `http://127.0.0.1:4173/`. Open the URLs in [features/](features/README.md) there, and stop the preview server you started when done.

In a Claude Duet thread there is no Chrome, and the Chrome downloads are blocked, so this step is `BLOCKED` there. Say so in the pull request, link the pull request's CI run (it installs Chrome and runs `check:target-size`), and name the URLs a reviewer should open.

### What each change needs

| Change | Steps |
| --- | --- |
| `src/features/`, `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `index.html`, `vite.config.ts` | 1 and 3 |
| `src/harness/` | 1, and 3 when a view changes |
| `src/catalog/`, `src/layouts/`, `src/content-layouts/`, `src/page-types/`, `src/flows/` (the inventories, see `proposals/README.md`) | 1, 2 and 3 |
| `src/inputs/`, `src/rules/`, `package.json` and `package-lock.json` (the Todae version) | 1, 2 and 3 |
| `scripts/`, `fixtures/` | 1 and 2 |
| `*.test.ts(x)`, `src/test-setup.ts`, `src/vite-env.d.ts`, `tsconfig.json`, `eslint.config.js`, `.npmrc`, `.gitignore` | 1 |
| `proposals/` | 1. A proposal changes nothing until it graduates. |
| `.github/` | 1, then the pull request's CI run is the rest of the proof; link it |
| `README.md`, `AGENTS.md`, `CODEOWNERS`, `docs/`, `review/`, `CLAUDE.md`, `.claude/` | 1. Review covers the rest. |

## Helpers

None. The drive is the repository's own npm scripts and Vitest journeys; [features/](features/README.md) names the command and the expected result for each feature.

## Evidence

Put the tested commit's full SHA in the pull request body, with each command and the line that gives its verdict: the `fixtures:` summary, each check's verdict line (such as `step budget: within budget.` or `inventory: membership matches <sha>.`), and the Vitest `Tests` count. For step 3, the `target size:` line. Proof standards:

- Drive the real path: a check runs against `src/` as it is, and a journey goes through the rendered controls, never by calling a transition or setting state directly.
- Check the end state: the flow state the journey lands on, the check's exit code and its message, not only that nothing threw.
- A new rule is half proven until an illegal fixture fails it.

## Cleanup

Each step cleans up after itself. `npm run build` leaves `dist/`, which git ignores. Stop a `vite dev` or `vite preview` server you started; never one you didn't.
