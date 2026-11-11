# Payables collections

The app shell frames three collection pages: **To approve** (pending invoices), **All invoices** (every invoice with its status) and **Vendors** (read-only). Each collection body is the `data-table` content layout: search, filters, sort and paging. A collection page has no primary action.

## Sub-features

- Sidebar navigation between the three collections.
- Search, filter facets, sort and pagination in the table.
- Opening an invoice is a link in the table, not a button.

## How to get to it (user POV)

Open `/` for To approve, `?route=invoices` for All invoices, `?route=vendors` for Vendors, or use the sidebar.

## Driving it with Vitest and the browser

- Vitest: `src/App.test.tsx` ("navigates between the payables collections") and `src/features/invoice-approval/InvoiceApproval.test.tsx` (queue without Approve, search and paging, statuses and vendors).
- Checks: `check:one-thing` fails a primary on a collection page; `check:inventories` fails a body that isn't a registered content layout.
- Browser: `check:target-size` opens `ready&page=collection`, `ready&route=invoices` and `ready&route=vendors`.

## Gotchas

- Search, filters and paging are not steps on the happy path, so they never count toward `max_steps`.
