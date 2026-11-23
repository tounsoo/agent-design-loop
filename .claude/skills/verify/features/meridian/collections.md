# Payables collections

Meridian's `app-shell` frame has three collection pages in its `Main` navigation: To approve (pending invoices), All invoices (every invoice with its status) and Vendors (a card for each vendor, with a form to add one). To approve and All invoices are searchable, pageable tables; Vendors is a searchable directory. A collection page has no primary action: opening an invoice or a vendor is a link, and the vendor form sits behind a disclosure.

## Sub-features

- `collections-nav` moves between the three collections, marks the current one and moves focus to its heading.
- `collections-search` narrows the table or the directory and clears back.
- `collections-paging` moves to the next page of rows.
- `collections-no-primary` keeps Approve off every collection.
- `vendors-add` adds a vendor from the form, after refusing an empty form, a bad email and a name already listed.

## How to get to it (user POV)

- Open `/` for To approve, `?route=invoices` for All invoices or `?route=vendors` for Vendors.
- Choose `To approve`, `All invoices` or `Vendors` in the `Main` navigation.
- On Vendors, open `Add a vendor`, or search for a name that isn't there and choose `Add “<name>”`.

## Driving it with Vitest and a browser

Preconditions:

- The baseline preconditions hold, and Meridian is on To approve.

- **Navigate.** Choose `All invoices`, then `Vendors`. Run `npx vitest run -t "navigates between the payables collections"` and `npx vitest run -t "moves focus to the new page's heading on every page change, and not on the first page"`. Each choice shows a heading of the same name, its link has `aria-current="page"`, and the heading has focus.
- **Search and page.** Type `Helios` in the `Search invoices` searchbox, clear it, choose `Next`. Run `npx vitest run -t "searches the queue and pages the rest"`. Only `INV-1907` shows while searching; after `Next`, `INV-1888` shows and `INV-1842` doesn't.
- **Every status.** Run `npx vitest run -t "lists every status on all invoices and vendors on their own collection"`. All invoices lists each status, and Vendors lists the vendors.
- **Add a vendor.** On Vendors, open `Add a vendor`, choose `Add vendor` with the form empty, then fill `Vendor name`, `Remittance email` and `Payment terms` and choose `Add vendor`. Run `npx vitest run -t "adds a vendor after refusing an empty form, a bad email and a name already listed"`, `npx vitest run -t "offers to add a vendor the search does not find"` and `npx vitest run -t "clears the search after an add, so the new vendor's card shows"`. The empty form shows `Enter the vendor's name.`; a good one shows the status `Added Ridgeway Janitorial.`, a card with `No invoices yet` and `10 vendors`.
- **Empty and error on Vendors.** Open `?scenario=empty&route=vendors` and `?scenario=error&route=vendors`. Run `npx vitest run -t "opens the form on an empty vendor list"` and `npx vitest run -t "names vendors in the Vendors load error"`. The first shows `No vendors yet` with the form open; the second shows `Couldn't load vendors.` with `Try again`.
- **No primary.** Look for Approve on To approve. Run `npx vitest run -t "shows the queue without an approve button"` and `npm run check:one-thing -- --config products/meridian/harness.config.ts`. No `Approve` button; the check prints `no primary on a collection or content page`.
- **Browser.** Open `?scenario=queue`, `?scenario=invoices`, `?scenario=vendors` and `?scenario=vendor-added` in the preview. Each shows its heading and its table or directory inside the shell; Vendor added shows the status `Added Ridgeway Janitorial.` and the open form.

## Gotchas

- Search, filters, paging and adding a vendor are not steps on the happy path, so they never count toward `max_steps`.
- To approve and All invoices use the `data-table` content layout; Vendors uses `directory`. The heading and description are the `collection` page type's chrome, and every other block on the page is a content layout.
- A vendor's card links to its page, which [the vendor page](vendor-page.md) covers.

## Covers

- Page types: `collection`
- Layouts: `app-shell`
- Content layouts: `data-table`, `directory`
- Scenarios: `?scenario=queue`, `?scenario=invoices`, `?scenario=vendors`, `?scenario=vendor-added`
