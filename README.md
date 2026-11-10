# tounsoo/agent-design-loop

This repository is a testing ground for deterministic UI design for agents. An agent generates UI inside constraints that already live in the repo, runs checks that can fail the build, fixes what those checks allow, and opens a proposal when a rule has to break.

The product surface is vendor invoice approval. The page types are `collection` (the approval queue) and `detail` (one invoice). The named task is `approve-vendor-invoice`.

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

Open the URL Vite prints. The default screen is the invoice queue: vendor, amount, and due date. Opening a vendor is a link, not a second primary button.

On the invoice:

- **Approve** is the only primary action.
- **Line items** sit behind one disclosure.
- **Request changes** is secondary. Choosing it reveals a required reason. Sending that request is a branch, not the happy path.

The happy path is three steps: open an invoice, open Line items, Approve. That lands on `invoice-approved`. `max_steps` stays 3. There is no approval note and no confirm step.

Modeled states are previewable with `?state=` and, when the screen matters, `?page=`:

- `?state=loading`
- `?state=empty`
- `?state=error`
- `?state=ready&page=collection`
- `?state=ready&page=detail`
- `?state=invoice-approved&page=detail`
- `?state=changes-requested&page=detail`

A state the model does not name is ignored, and the page stays on the queue.

## Run the checks

```sh
npm run check:fixtures && npm run check
```

`check:fixtures` exits 0 only when the illegal fixtures fail their checks. `check` is the build gate:

| Command | What it fails |
| --- | --- |
| `npm run typecheck` | A modeled state with no exhaustive view, and ordinary type errors |
| `npm run lint` | ESLint, plus off-catalog UI and the detail primary-slot contract |
| `npm run check:step-budget` | A task path longer than that task's `max_steps` |
| `npm run check:disclosure` | Disclosure depth or count above the cap |
| `npm run check:priority` | A primary action that is not Approve, or Request changes shown as primary |
| `npm run check:one-thing` | A page type other than collection or detail, a second shell, or a primary on the queue |
| `npm run check:state-coverage` | A modeled flow state with no view |
| `npm run check:target-size` | An invoice control under WCAG 2.5.8 (24 CSS px), spacing exception included. Needs Chrome. |
| `npm run test` | The flow, the three-step journey, the request-changes branch, and the rendered states |

There is no LLM judge on CI.

## Use it as a testing ground

1. Give an agent a UI task that is already in `src/inputs/product.ts`. Do not invent a task or a page type in the same change.
2. The agent reads the inputs, the catalog, the page shells, and the flow, then generates inside those constraints. `AGENTS.md` is only the pointer.
3. The agent runs the checks and fixes exit codes: a second primary, a raw control, a skipped state, a path over the budget.
4. What the checks cannot decide goes in `review/` as a short note.
5. If a rule has to break, the agent adds a file under `proposals/` with a reason and a preview. It does not silently raise `max_steps`, add a page type, or bypass the catalog.

[Proposal 0001](proposals/0001-approval-note.md) asks to require an approval note before Approve and raise the budget to 4. It is not applied.

When a human approves a proposal, graduate it into the catalog, a page-type shell, the flow model, or `src/inputs/product.ts`. The next run is constrained by that change. See [proposals/README.md](proposals/README.md).

## Where the constraints live

```
src/catalog/                         only UI entry; re-exports @tounsoo/todae
src/page-types/collection/           heading and list; no primary action
src/page-types/detail/               heading, body, one primary, secondary
src/flows/invoice-approval/          loading, empty, error, ready, invoice-approved, changes-requested
src/inputs/product.ts                tasks, priority, allowed page types
src/rules/ux-rules.ts                check, input, and review question for each rule
src/features/invoice-approval/       the shipped queue and detail
src/harness/state-preview/           ?state= and ?page= preview
fixtures/illegal/                    two primaries, over budget, off catalog, missing view
proposals/                           escape hatch
review/                              judgment the checks cannot make
```
