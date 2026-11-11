# Meridian

Meridian is the sample product the design loop is tested on: an accounts-payable workspace for vendor invoice approval. The frame is an app shell. The page types are `collection` (To approve, All invoices, and Vendors) and `detail` (one invoice). The named task is `approve-vendor-invoice`. [How Meridian works](docs/how-it-works.md) walks through its screens, its flow, and the inputs its rules read. The checks it runs are the [harness's](../../packages/harness/README.md).

Layouts are product-owned shells with named slots. They encode [Todae](https://github.com/tounsoo/todae) recipes. Recipes are copyable glue, not package namespaces: there is no `AppShell.*`, `DataTable.*`, or `FilterBar.*` export, and this repo does not fork Todae.

Chrome layouts are the frame. Content layouts are the compositions that fill a page type's body. The allowlists are `allowed_layouts` and `allowed_content_layouts` in `products/meridian/inputs/product.ts`. This file does not decide membership.

| Piece | Where | Recipe |
| --- | --- | --- |
| App shell, the frame | `products/meridian/layouts/app-shell` | [App shell](https://todae.omsoo.design/recipes/app-shell) |
| Data table, the collection body | `products/meridian/content-layouts/data-table` | [Filter bar](https://todae.omsoo.design/recipes/filter-bar) and [Data table](https://todae.omsoo.design/recipes/data-table) |
| Collection page | `products/meridian/page-types/collection` | Heading and body. The ready body is a content layout |
| Detail page | `products/meridian/page-types/detail` | Breadcrumbs and DataList for one record |

The app shell is the frame, not a third page type. A different body composition is a content layout, not a new entry in `allowed_layouts`.

The app uses React 19, TypeScript 6, and the published package `@tounsoo/todae`. Icons come from Lucide, as the recipes do. Todae ships no icons.

## Run the app

```sh
npm run dev
```

Open the URL Vite prints. The default screen is the Meridian workspace on **To approve**: a full-height shell, sidebar navigation, and a searchable invoice table. Opening an invoice is a link in the table, not a primary button. Approve is not on the queue.

`npm run build` and `npm run preview` build and serve Meridian. `npm run check:meridian` runs every rule check on Meridian's config.

## Navigation

- **To approve** (`/`): pending invoices.
- **All invoices** (`?route=invoices`): every invoice, with status.
- **Vendors** (`?route=vendors`): vendor name, open count, and last invoice. Read-only.

On an invoice (`?invoice=inv-1842`):

- Breadcrumbs return to the collection you came from.
- Identity and amounts are a DataList.
- **Approve** is the only primary action.
- **Line items** sit behind one disclosure.
- **Request changes** is secondary. Choosing it reveals a required reason. Sending that request is a branch, not the happy path.

Search, filters, sort, and paging are available on collections. They are not steps on the happy path.

The happy path is two steps: open an invoice, Approve. That lands on `invoice-approved`. Opening Line items is optional and not counted. `max_steps` stays 3. There is no approval note and no confirm step. `check:step-budget` measures the task graph and the shipped reducer, and fails when either shortest path is over budget, when the two are not the same steps, or when any other route to `invoice-approved` is over budget.

[Proposal 0001](../../proposals/0001-approval-note.md) asks to require an approval note before Approve and raise the budget to 4. It is not applied. [Proposal 0003](../../proposals/0003-two-step-approve.md) corrects its counts: the shipped path is 2 steps, so the note would make 3, inside the current budget.

## Previews

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

## Where the constraints live

Paths are relative to `products/meridian/`.

```
harness.config.ts             where the checks find Meridian's inventories, flows, UI and adapter
catalog/                      only UI entry; re-exports @tounsoo/todae
layouts/app-shell/            Meridian frame: header, nav, drawer; no page type
content-layouts/data-table/   collection body: filter bar, table, pagination
page-types/collection/        heading and body; no primary. Ready body is a content layout
page-types/detail/            breadcrumbs, meta, body, one primary, secondary
flows/invoice-approval/       loading, empty, error, ready, invoice-approved, changes-requested
inputs/product.ts             tasks, priority, disclosed sections, allowed layouts, content layouts, page types
rules/ux-rules.ts             check, input, and review question for each rule
features/invoice-approval/    To approve, All invoices, Vendors, and the invoice
preview/                      Meridian's state preview: ?state=, ?page=, ?branch=, ?route=, and ?invoice=
review/                       judgment the checks cannot make
App.tsx, main.tsx, index.html the app entry, which check:target-size builds
```

The checks read these paths from `products/meridian/harness.config.ts`, not from constants of their own. They read Todae's component names, such as `Button.Root`, `Disclosure.Root` and `Field.Root`, from the adapter that config names, `packages/adapter-todae/index.ts`.

## Review notes

What the checks cannot decide is written down in `products/meridian/review/`. Each note splits "what the checks already decided" from "what the checks cannot decide."

- [`approve-vendor-invoice.md`](review/approve-vendor-invoice.md): the task
- [`inventories.md`](review/inventories.md): layouts, page types, the catalog, and the limits of the inventory check
- [`content-layouts.md`](review/content-layouts.md): the collection body
