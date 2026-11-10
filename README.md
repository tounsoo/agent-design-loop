# tounsoo/agent-design-loop

This repository is a testing ground for deterministic UI design for agents. An agent generates UI inside constraints that already live in the repo, runs checks that can fail the build, fixes what those checks allow, and opens a proposal when a rule has to break.

The only product surface is notification settings. The only page type is `settings`. The only journey is `update-notification-prefs`.

## Install

Node.js 22 or newer.

```sh
npm install
```

The app uses React 19, TypeScript 6, and the published package `@tounsoo/todae`. It does not fork [Todae](https://github.com/tounsoo/todae).

## Run the app

```sh
npm run dev
```

Open the URL Vite prints. The page is notification settings:

- **Save** is the only primary action.
- **Delivery windows** is secondary, behind one disclosure.
- The happy path is four steps: change a channel, open Delivery windows, change a window, Save. That lands on `prefs-saved`.

Modeled states are previewable with `?state=`:

- `?state=loading`
- `?state=empty`
- `?state=error`
- `?state=ready`
- `?state=prefs-saved`

A state the model does not name is ignored, and the page stays on the interactive ready flow.

## Run the checks

```sh
npm run check:fixtures && npm run check
```

`check:fixtures` exits 0 only when the illegal fixtures fail their checks. `check` is the build gate:

| Command | What it fails |
| --- | --- |
| `npm run typecheck` | A modeled state with no exhaustive view, and ordinary type errors |
| `npm run lint` | ESLint, plus off-catalog UI and the settings primary-slot contract |
| `npm run check:step-budget` | A task path longer than that task's `max_steps` |
| `npm run check:disclosure` | Disclosure depth or count above the cap |
| `npm run check:priority` | A primary action that is not the rank-1 item, or a rank-2 item that is not disclosed |
| `npm run check:one-thing` | Another page type, a second settings page, or a second question shown before disclosure |
| `npm run check:state-coverage` | A modeled flow state with no view |
| `npm run check:target-size` | A settings control under WCAG 2.5.8 (24 CSS px), spacing exception included. Needs Chrome. |
| `npm run test` | The flow, the four-step journey, and the rendered states |

There is no LLM judge on CI.

## Use it as a testing ground

1. Give an agent a UI task that is already in `src/inputs/product.ts`. Do not invent a task or a page type in the same change.
2. The agent reads the inputs, the catalog, the settings shell, and the flow, then generates inside those constraints. `AGENTS.md` is only the pointer.
3. The agent runs the checks and fixes exit codes: a second primary, a raw control, a skipped state, a path over the budget.
4. What the checks cannot decide goes in `review/` as a short note.
5. If a rule has to break, the agent adds a file under `proposals/` with a reason and a preview. It does not silently raise `max_steps`, add a page type, or bypass the catalog.

The shipped notification settings already passed that loop once. A first draft that put Delivery windows in the primary slot, and that added confirm-before-save, would fail the slot check and the step budget (`max_steps` is 4). The corrected UI has one primary and no confirm step. [Proposal 0001](proposals/0001-confirm-before-save.md) asks to add confirm-before-save and raise the budget to 5. It is not applied.

When a human approves a proposal, graduate it into the catalog, the page-type shell, the flow model, or `src/inputs/product.ts`. The next run is constrained by that change. See [proposals/README.md](proposals/README.md).

## Where the constraints live

```
src/catalog/                         only UI entry; re-exports @tounsoo/todae
src/page-types/settings/             heading, body, one primary, secondary
src/flows/notification-prefs/        loading, empty, error, ready, prefs-saved
src/inputs/product.ts                tasks, priority, allowed page types
src/rules/ux-rules.ts                check, input, and review question for each rule
src/features/notification-settings/  the shipped page
src/harness/state-preview/           ?state= preview
fixtures/illegal/                    two primaries, over budget, off catalog, missing view
proposals/                           escape hatch
review/                              judgment the checks cannot make
```
