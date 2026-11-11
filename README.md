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

The happy path is two steps: open an invoice, Approve. That lands on `invoice-approved`. Opening Line items is optional and not counted. `max_steps` stays 3. There is no approval note and no confirm step. `check:step-budget` measures the task graph and the shipped reducer, and fails when either is over budget or the two paths are not the same steps.

The shell stays up in every modeled state. Loading, empty, and error render inside `main`. A **Preview** menu in the header is a developer aid for opening those states without clicking through. It links to Loading, Empty, Error, Queue (`/`), Detail, Invoice approved, and Changes requested. The default URL does not depend on it.

These are the preview URLs `check:target-size` opens. The menu has no entry for the All invoices and Vendors routes or for the request-changes branch, so type those URLs.

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

A `?state=` value the model does not name is ignored. The rest of the URL decides the page, which is To approve when nothing else is set.

## Run the checks

```sh
npm run check:fixtures && npm run check
```

`check:fixtures` runs the harness's own tests. `fixtures/product/` is a small product with its own `harness.config.ts` that every check passes. Each folder beside it, and each one under `fixtures/illegal/`, has a `case.ts` that changes some of that config's paths and names the checks to run, with the phrase each must print. The run exits 0 only when the illegal cases fail and the legal ones pass: the fixture product, the stand-in design system in `fixtures/fake-ds/`, and small products of their own (`fixtures/two-tasks/`, `fixtures/two-collection-pages/`, `fixtures/own-sections/`) that show a rule reads its product's config and inputs, not Meridian's. `check` is the build gate:

| Command | What it fails |
| --- | --- |
| `npm run typecheck` | A modeled state with no exhaustive view, and ordinary type errors |
| `npm run lint` | ESLint, plus off-catalog UI (including an import from another product's directories) and the primary-slot contract |
| `npm run check:step-budget` | A task path longer than that task's `max_steps`, a task graph and shipped reducer whose paths differ, or a task in `tasks` with no graph mapped under `flows[].tasks` in `harness.config.ts`. Every task is measured |
| `npm run check:disclosure` | Disclosure depth or count above the cap |
| `npm run check:priority` | A primary action that is not Approve, Request changes shown as primary, or a section in `disclosed_sections` that is not behind a disclosure |
| `npm run check:one-thing` | Per page: a page rendered inside another page, a primary on a collection page, or more visible questions than the cap. Also a page type that renders no page. A product may render a page type as often as it needs. Page-type membership is `allowed_page_types`, which this check reads |
| `npm run check:inventories` | A chrome layout, content layout, or page type outside the allowlists; a collection body that is not a registered content layout; or an inventory-set change versus the pull request base with no new proposal. A product the base does not have at all, such as a new one under `products/`, is such a change. A list the base does not export yet may be recorded once. That bootstrap covered `allowed_layouts` and `allowed_content_layouts`, and it covers the design system adapter the config names. A config file the base does not have is a change, so a renamed config needs a proposal |
| `npm run check:state-coverage` | A modeled flow state with no view |
| `npm run check:target-size` | A control under WCAG 2.5.8 (24 CSS px), spacing exception included, on any modeled state. It opens every state in `modeledStates`: bare, or once per query string that `flows[].previews` in `harness.config.ts` lists for it. Needs Chrome; `--list` prints the previews without it. |
| `npm run test` | The flow, the two-step journey, the request-changes branch, and the rendered states |

There is no LLM judge on CI.

A second product, Nook, a room booking app under `products/nook/`, has its own `harness.config.ts` and passes the same checks. CI runs it as its own job:

```sh
npm run check:product -- --config products/nook/harness.config.ts
```

`check:product` runs every check in `check` against that config, in the same order, and stops at the first failure. `npm run dev:nook` starts the app.

A check reads its paths only from a config: `harness.config.ts`, or the one `--config <file>` names. Besides `--config`, `check:inventories` reads `--base <file>` and `check:target-size` reads `--list`. Any other flag, and any `--name=<value>` form, is refused, so a stale invocation cannot pass on the wrong product.

## Use it as a testing ground

1. Give an agent a UI task that is already in `src/inputs/product.ts`. Do not invent a task, a layout, a content layout, or a page type in the same change.
2. The agent reads the inventories: product inputs, UX rules, the catalog, layouts, content layouts, page types, and the flow. `AGENTS.md` is only the pointer. It does not list what those inventories contain.
3. The agent runs the checks and fixes exit codes: a second primary, a raw control, a skipped state, a path over the budget, a layout, content layout, or page type that is not in the allowlist, or a collection body that is not a registered content layout.
4. What the checks cannot decide goes in `review/` as a short note.
5. If a rule has to break, or the work needs a catalog export, layout, content layout, page type, flow state, or rule input that is not already recorded, the agent adds a file under `proposals/` with a reason, a preview, and a graduation. It does not invent the missing piece, and it does not edit the inventory to sneak the change through. The inventory check fails that membership change when the pull request has no new proposal. See [proposals/README.md](proposals/README.md).

[Proposal 0001](proposals/0001-approval-note.md) asks to require an approval note before Approve and raise the budget to 4. It is not applied. [Proposal 0003](proposals/0003-two-step-approve.md) corrects its counts: the shipped path is 2 steps, so the note would make 3, inside the current budget.

When a human approves a proposal, a change graduates it into the inventory data and the checks: the catalog, a layout, a content layout, a page-type shell, the flow model, or `src/inputs/product.ts`. The next run is constrained by that change. The inventory check accepts that change in the same pull request as the proposal, so a reviewer decides whether it should have waited. A proposal can also record a decision that lands with its own pull request, as [proposal 0003](proposals/0003-two-step-approve.md) and [proposal 0004](proposals/0004-config-tasks-and-previews.md) do. See [proposals/README.md](proposals/README.md).

## Where the constraints live

```
harness.config.ts                    where the checks find Meridian's inventories, flows, UI and adapter
adapters/todae.ts                    Todae's names for the parts the checks count: button, disclosure, field
src/catalog/                         only UI entry; re-exports @tounsoo/todae
src/layouts/app-shell/               Meridian frame: header, nav, drawer; no page type
src/content-layouts/data-table/     collection body: filter bar, table, pagination
src/page-types/collection/           heading and body; no primary. Ready body is a content layout
src/page-types/detail/               breadcrumbs, meta, body, one primary, secondary
src/flows/invoice-approval/          loading, empty, error, ready, invoice-approved, changes-requested
src/inputs/product.ts                tasks, priority, disclosed sections, allowed layouts, content layouts, page types
src/rules/ux-rules.ts                check, input, and review question for each rule
src/features/invoice-approval/       To approve, All invoices, Vendors, and the invoice
src/harness/state-preview/           Meridian's state preview: ?state=, ?page=, ?branch=, ?route=, and ?invoice=
fixtures/product/                    the fixture product: its own harness.config.ts, and every check passes it
fixtures/illegal/                    known-bad shapes; check:fixtures proves each one still fails
fixtures/fake-ds/                    a stand-in design system with no Todae names; the checks must pass it
fixtures/two-tasks/ and others       small products of their own; the checks must pass them
products/nook/                       a second product, room booking, with its own config; CI runs it as its own job
proposals/                           escape hatch
review/                              judgment the checks cannot make
```

Despite the name, `src/harness/` is not the generic loop. It is Meridian's state preview: it reads invoice ids and Meridian routes. The generic parts are the check scripts, `fixtures/`, `proposals/`, and `review/`. The checks read Meridian's paths from `harness.config.ts`, not from constants of their own. They read Todae's component names, such as `Button.Root`, `Disclosure.Root` and `Field.Root`, from the adapter that config names, `adapters/todae.ts`.
