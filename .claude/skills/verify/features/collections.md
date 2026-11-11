# Payables collections

Meridian's frame has three collection pages in the sidebar: To approve (pending invoices), All invoices (every invoice with its status) and Vendors (read-only). Each one is a searchable, pageable table. A collection page has no primary action, and opening an invoice is a link in the table.

## Sub-features

- `collections-nav` moves between the three collections and marks the current one.
- `collections-search` narrows the table and clears back.
- `collections-paging` moves to the next page of rows.
- `collections-no-primary` keeps Approve off every collection.

## How to get to it (user POV)

- Open `/` for To approve, `?route=invoices` for All invoices or `?route=vendors` for Vendors.
- Choose `To approve`, `All invoices` or `Vendors` in the `Main` navigation.

## Driving it with Vitest and a browser

Preconditions:

- The baseline preconditions hold, and Meridian is on To approve.

- **Navigate.** Choose `All invoices`, then `Vendors`. Run `npx vitest run -t "navigates between the payables collections"`. Each choice shows a heading of the same name, and its link has `aria-current="page"`.
- **Search and page.** Type `Helios` in the `Search invoices` searchbox, clear it, choose `Next`. Run `npx vitest run -t "searches the queue and pages the rest"`. Only `INV-1907` shows while searching; after `Next`, `INV-1888` shows and `INV-1842` doesn't.
- **No primary.** Look for Approve on To approve. Run `npx vitest run -t "shows the queue without an approve button"` and `npm run check:one-thing -- --config products/meridian/harness.config.ts`. No `Approve` button; the check prints `no primary on the collection page`.
- **Browser.** Open `/`, `?route=invoices` and `?route=vendors` in the preview. Each shows its heading and table inside the shell.

## Gotchas

- Search, filters and paging are not steps on the happy path, so they never count toward `max_steps`.
