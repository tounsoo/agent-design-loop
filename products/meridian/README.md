# Meridian

Meridian is the sample product the design loop is tested on: an accounts-payable workspace for vendor invoice approval. The frame is an app shell. The page types are `collection` (To approve, All invoices, and Vendors), `detail` (one invoice) and `profile` (one vendor). The named task is `approve-vendor-invoice`. [How Meridian works](docs/how-it-works.md) walks through its screens, its flow, and the inputs its rules read. The checks it runs are the [harness's](../../packages/harness/README.md).

Layouts are product-owned shells with named slots. They encode [Todae](https://github.com/tounsoo/todae) recipes. Recipes are copyable glue, not package namespaces: there is no `AppShell.*`, `DataTable.*`, `Directory.*` or `FilterBar.*` export, and this repo does not fork Todae.

Chrome layouts are the frame. Content layouts are the compositions that fill a page type's body. The allowlists are `allowed_layouts` and `allowed_content_layouts` in `products/meridian/inputs/product.ts`. This file does not decide membership.

| Piece | Where | Recipe |
| --- | --- | --- |
| App shell, the frame | `products/meridian/layouts/app-shell` | [App shell](https://todae.omsoo.design/recipes/app-shell) |
| Data table, the To approve and All invoices body | `products/meridian/content-layouts/data-table` | [Filter bar](https://todae.omsoo.design/recipes/filter-bar) and [Data table](https://todae.omsoo.design/recipes/data-table) |
| Directory, the Vendors body | `products/meridian/content-layouts/directory` | None. Search, an add form behind a disclosure, and a grid of cards |
| Collection page | `products/meridian/page-types/collection` | Heading and body. The ready body is a content layout |
| Detail page | `products/meridian/page-types/detail` | Breadcrumbs and DataList for one record |
| Profile page | `products/meridian/page-types/profile` | Breadcrumbs, facts, and sections that each render their own heading. No primary action |

The app shell is the frame, not a third page type. A different body composition is a content layout, not a new entry in `allowed_layouts`.

The app uses React 19, TypeScript 6, and the published package `@tounsoo/todae`. Icons come from Lucide, as the recipes do. Todae ships no icons.

## Run the app

```sh
npm run dev
```

Open the URL Vite prints. The default screen is the Meridian workspace on **To approve**: a full-height shell, sidebar navigation, and a searchable invoice table. Opening an invoice is a link in the table, not a primary button. Approve is not on the queue.

`npm run build` and `npm run preview` build and serve Meridian. `npm run check:product -- --config products/meridian/harness.config.ts` runs every rule check on Meridian's config, and `npm run check:products` runs them on every product.

## Navigation

- **To approve** (`/`): pending invoices.
- **All invoices** (`?route=invoices`): every invoice, with status.
- **Vendors** (`?route=vendors`): a card per vendor with its remittance email, payment terms, open count and last invoice, and an **Add a vendor** form behind the page's one disclosure. The form checks that the name is new and the email is an address before it adds the vendor. Added vendors last until the page reloads. [Proposal 2026-11-12-vendor-directory](../../proposals/2026-11-12-vendor-directory.md) added the directory content layout, the `vendor-added` state, and `Card`, `Description`, `Form` and `Grid` to the catalog. Each card's vendor name links to that vendor's page.
- **A vendor** (`?route=vendors&vendor=helios-freight`): the vendor's remittance email, terms and open total, then Open invoices and Approved, each a table of invoice links, with a section left out when it has no rows. It has no button. Vendors stays current in the navigation. [Proposal 2026-11-12-vendor-page](../../proposals/2026-11-12-vendor-page.md) added the `profile` page type for it, the first page type under `shells.content`.

On an invoice (`?invoice=inv-1842`):

- Breadcrumbs return to the collection you came from.
- Identity and amounts are a DataList.
- **Invoice progress** is a read-only list of three stages: Received, Approval, and Payment with its due date. It follows the invoice's status. [Proposal 2026-11-11-invoice-progress-steps](../../proposals/2026-11-11-invoice-progress-steps.md) added `Steps` to the catalog for it.
- **Approve** is the only primary action.
- **Line items** sit behind one disclosure.
- **Request changes** is secondary. Choosing it reveals a required reason. Sending that request is a branch, not the happy path.

Search, filters, sort, and paging are available on the invoice collections, and search on Vendors. They are not steps on the happy path.

The happy path is two steps: open an invoice, Approve. That lands on `invoice-approved`. Opening Line items is optional and not counted. `max_steps` stays 3. There is no approval note and no confirm step. `check:step-budget` measures the task graph and the shipped reducer, and fails when either shortest path is over budget, when the two are not the same steps, or when any other route to `invoice-approved` is over budget.

[Proposal 0001](../../proposals/0001-approval-note.md) asks to require an approval note before Approve and raise the budget to 4. It is not applied. [Proposal 0003](../../proposals/0003-two-step-approve.md) corrects its counts: the shipped path is 2 steps, so the note would make 3, inside the current budget.

## Scenarios

The shell stays up in every modeled state. Loading, empty, and error render inside `main`. Each case the checks and the screenshots open is a scenario in [`flows/invoice-approval/scenarios.ts`](flows/invoice-approval/scenarios.ts): a modeled state, with the page, route or branch that shows it, opened at `?scenario=<id>`. A **Preview** menu in the header is a developer aid that links to `Live` and to each scenario. The default URL does not depend on it.

- `?scenario=loading`, `?scenario=empty`, `?scenario=error`
- `?scenario=queue`: To approve, `ready`
- `?scenario=invoices` and `?scenario=vendors`: All invoices and Vendors, `ready`
- `?scenario=invoice-detail` and `?scenario=invoice-requesting-changes`: the invoice, `ready`, with the request-changes branch open in the second
- `?scenario=invoice-approved` and `?scenario=changes-requested`: the invoice after each decision
- `?scenario=vendor-added`, which opens Vendors, because that state belongs to that route
- `?scenario=vendor-helios-freight`, `?scenario=vendor-harbor-and-pine`, `?scenario=vendor-nothing-open` and `?scenario=vendor-no-invoices`: a vendor's page with open and approved invoices, open only, approved only, and none (a 64-character name); `?scenario=vendor-unknown`: a vendor Meridian does not have, which opens Vendors

An id the file does not have is ignored. The rest of the URL decides the page, which is To approve when nothing else is set: `?route=invoices`, `?route=vendors` and `?invoice=<id>` still open the live app there. A new case, such as a long vendor name, is a new scenario in that file, with no proposal.

## Where the constraints live

Paths are relative to `products/meridian/`.

```
harness.config.ts             where the checks find Meridian's inventories, flows, UI and adapter
catalog/                      only UI entry; re-exports @tounsoo/todae
layouts/app-shell/            Meridian frame: header, nav, drawer; no page type
content-layouts/data-table/   invoice collection body: filter bar, table, pagination
content-layouts/directory/    Vendors body: search, the add-vendor form in a disclosure, cards
page-types/collection/        heading and body; no primary. Ready body is a content layout
page-types/detail/            breadcrumbs, meta, body, one primary, secondary
page-types/profile/           breadcrumbs, heading, meta, body of sections; no primary
flows/invoice-approval/       loading, empty, error, ready, invoice-approved, changes-requested, vendor-added; vendors.ts holds the vendors and their validation
inputs/product.ts             tasks, priority, disclosed sections, allowed layouts, content layouts, page types
rules/ux-rules.ts             check, input, and review question for each rule
features/invoice-approval/    To approve, All invoices, Vendors, a vendor, and the invoice
preview/                      reads ?scenario= into a first render, ?route= and ?invoice=, and the Preview menu
review/                       judgment the checks cannot make
App.tsx, main.tsx, index.html the app entry, which check:target-size builds
```

The checks read these paths from `products/meridian/harness.config.ts`, not from constants of their own. They read Todae's component names, such as `Button.Root`, `Disclosure.Root` and `Field.Root`, from the adapter that config names, `packages/adapter-todae/index.ts`.

## Review notes

What the checks cannot decide is written down in `products/meridian/review/`. Each note splits "what the checks already decided" from "what the checks cannot decide."

- [`approve-vendor-invoice.md`](review/approve-vendor-invoice.md): the task
- [`inventories.md`](review/inventories.md): layouts, page types, the catalog, and the limits of the inventory check
- [`content-layouts.md`](review/content-layouts.md): the collection body
- [`vendor-directory.md`](review/vendor-directory.md): adding a vendor
