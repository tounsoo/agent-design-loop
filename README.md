# tounsoo/agent-design-loop

New here? [How this design loop works](docs/how-it-works.md) explains the control ladder, the layers on a Meridian screen, the checks, and how a proposal graduates.

This repository is a testing ground for deterministic UI design for agents. An agent generates UI inside constraints that already live in the repo, runs checks that can fail the build, fixes what those checks allow, and opens a proposal when a rule has to break.

The product is **Meridian**, an accounts-payable workspace for vendor invoice approval. The frame is an app shell. The page types are `collection` (To approve, All invoices, and Vendors) and `detail` (one invoice). The named task is `approve-vendor-invoice`.

Layouts are product-owned shells with named slots. They encode [Todae](https://github.com/tounsoo/todae) recipes. Recipes are copyable glue, not package namespaces: there is no `AppShell.*`, `DataTable.*`, or `FilterBar.*` export, and this repo does not fork Todae.

Chrome layouts are the frame. Content layouts are the compositions that fill a page type's body. The allowlists are `allowed_layouts` and `allowed_content_layouts` in `src/inputs/product.ts`. This file does not decide membership.

| Piece | Where | Recipe |
| --- | --- | --- |
| App shell, the frame | `src/layouts/app-shell` | [App shell](https://todae.omsoo.design/recipes/app-shell) |
| Data table, the collection body | `src/content-layouts/data-table` | [Filter bar](https://todae.omsoo.design/recipes/filter-bar) and [Data table](https://todae.omsoo.design/recipes/data-table) |
| Collection page | `src/page-types/collection` | Heading and body. The ready body is a content layout |
| Detail page | `src/page-types/detail` | Breadcrumbs and DataList for one record |

The app shell is the frame, not a third page type. A different body composition is a content layout, not a new entry in `allowed_layouts`.

## Install

Node.js 22 or newer.

```sh
npm install
```

The app uses React 19, TypeScript 6, and the published package `@tounsoo/todae`. Icons come from Lucide, as the recipes do. Todae ships no icons.

## Run the app

```sh
npm run dev
```

Open the URL Vite prints. The default screen is the Meridian workspace on **To approve**: a full-height shell, sidebar navigation, and a searchable invoice table. Opening an invoice is a link in the table, not a primary button. Approve is not on the queue.

Navigation:

- **To approve** (`/`) — pending invoices.
- **All invoices** (`?route=invoices`) — every invoice, with status.
- **Vendors** (`?route=vendors`) — vendor name, open count, and last invoice. Read-only.

On an invoice (`?invoice=inv-1842`):

- Breadcrumbs return to the collection you came from.
- Identity and amounts are a DataList.
- **Approve** is the only primary action.
- **Line items** sit behind one disclosure.
- **Request changes** is secondary. Choosing it reveals a required reason. Sending that request is a branch, not the happy path.

Search, filters, sort, and paging are available on collections. They are not steps on the happy path.

The happy path is two steps: open an invoice, Approve. That lands on `invoice-approved`. Opening Line items is optional and not counted. `max_steps` stays 3. There is no approval note and no confirm step. `check:step-budget` measures the task graph and the shipped reducer, and fails when either is over budget or their lengths differ.

The shell stays up in every modeled state. Loading, empty, and error render inside `main`. A **Preview** menu in the header is a developer aid for opening those states without clicking through. The default URL does not depend on it.

- `?state=loading`
- `?state=empty`
- `?state=error`
- `?state=ready&page=collection`
- `?state=ready&route=invoices`
- `?state=ready&route=vendors`
- `?state=ready&page=detail`
- `?state=ready&page=detail&branch=request`
- `?state=invoice-approved&page=detail`
- `?state=changes-requested&page=detail`

A state the model does not name is ignored, and the page stays on To approve.

## Run the checks

```sh
npm run check:fixtures && npm run check
```

`check:fixtures` exits 0 only when the illegal fixtures fail their checks. `check` is the build gate:

| Command | What it fails |
| --- | --- |
| `npm run typecheck` | A modeled state with no exhaustive view, and ordinary type errors |
| `npm run lint` | ESLint, plus off-catalog UI and the detail primary-slot contract |
| `npm run check:step-budget` | A task path longer than that task's `max_steps`, or a task graph and shipped reducer whose path lengths differ |
| `npm run check:disclosure` | Disclosure depth or count above the cap |
| `npm run check:priority` | A primary action that is not Approve, or Request changes shown as primary |
| `npm run check:one-thing` | More than one shell for a page type, or a primary on a collection page. Page-type membership is `allowed_page_types`, which this check reads |
| `npm run check:inventories` | A chrome layout, content layout, or page type outside the allowlists; a collection body that is not a registered content layout; or an inventory-set change versus the pull request base with no new proposal. A list the base does not export yet may be recorded once. That bootstrap covered `allowed_layouts`, and it covers `allowed_content_layouts` |
| `npm run check:state-coverage` | A modeled flow state with no view |
| `npm run check:target-size` | An invoice control under WCAG 2.5.8 (24 CSS px), spacing exception included. Needs Chrome. |
| `npm run test` | The flow, the two-step journey, the request-changes branch, and the rendered states |

There is no LLM judge on CI.

## Use it as a testing ground

1. Give an agent a UI task that is already in `src/inputs/product.ts`. Do not invent a task, a layout, a content layout, or a page type in the same change.
2. The agent reads the inventories: product inputs, UX rules, the catalog, layouts, content layouts, page types, and the flow. `AGENTS.md` is only the pointer. It does not list what those inventories contain.
3. The agent runs the checks and fixes exit codes: a second primary, a raw control, a skipped state, a path over the budget, a layout, content layout, or page type that is not in the allowlist, or a collection body that is not a registered content layout.
4. What the checks cannot decide goes in `review/` as a short note.
5. If a rule has to break, or the work needs a catalog export, layout, content layout, page type, flow state, or rule input that is not already recorded, the agent adds a file under `proposals/` with a reason, a preview, and a graduation. It does not invent the missing piece, and it does not edit the inventory to sneak the change through. The inventory check fails that membership change when the pull request has no new proposal. See [proposals/README.md](proposals/README.md).

[Proposal 0001](proposals/0001-approval-note.md) asks to require an approval note before Approve and raise the budget to 4. It is not applied. [Proposal 0003](proposals/0003-two-step-approve.md) corrects its counts: the shipped path is 2 steps, so the note would make 3, inside the current budget.

When a human approves a proposal, a separate change graduates it into the inventory data and the checks: the catalog, a layout, a content layout, a page-type shell, the flow model, or `src/inputs/product.ts`. The next run is constrained by that change. See [proposals/README.md](proposals/README.md).

## Where the constraints live

```
src/catalog/                         only UI entry; re-exports @tounsoo/todae
src/layouts/app-shell/               Meridian frame: header, nav, drawer; no page type
src/content-layouts/data-table/     collection body: filter bar, table, pagination
src/page-types/collection/           heading and body; no primary. Ready body is a content layout
src/page-types/detail/               breadcrumbs, meta, body, one primary, secondary
src/flows/invoice-approval/          loading, empty, error, ready, invoice-approved, changes-requested
src/inputs/product.ts                tasks, priority, disclosed sections, allowed layouts, content layouts, page types
src/rules/ux-rules.ts                check, input, and review question for each rule
src/features/invoice-approval/       To approve, All invoices, Vendors, and the invoice
src/harness/state-preview/           Meridian's state preview: ?state=, ?page=, ?route=, and ?invoice=
fixtures/illegal/                    known-bad shapes; check:fixtures proves each one still fails
proposals/                           escape hatch
review/                              judgment the checks cannot make
```

Despite the name, `src/harness/` is not the generic loop. It is Meridian's state preview: it reads invoice ids and Meridian routes. The generic parts are the check scripts, `fixtures/`, `proposals/`, and `review/`.
