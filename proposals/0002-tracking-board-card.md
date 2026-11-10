# Proposal 0002: Card, and a status-board content layout

Status: applied in this change so Tracking can be built. A `board` page type is not applied. Proposal 0001 is not applied. `max_steps` stays 3.

Layers: the component catalog, `src/catalog/index.ts`, and content layouts, `allowed_content_layouts` in `src/inputs/product.ts`.

## Reason

Invoice tracking is a status board. Each invoice is one unit that sits beside others in a column: number, vendor, amount, and due date or aging. Todae's Card is that surface. Its documentation says a card is not a button or a link, so the invoice number stays a link inside the card. Stack is for spacing with no surface, which is the wrong primitive for these cards. Card is not in the catalog on main.

The board is a content layout of `collection`, not a new page type.

Tracking is still a collection. The page has one heading, a description, and a body, and it has no primary action. The reader picks one invoice and opens the existing detail. Loading, empty, and error stay in the collection shell. To approve, All invoices, and Vendors already share that shell. The difference is the body: columns of cards, not a filter bar and a table. Content layouts are the compositions that fill a page type's body. `data-table` is the table. `status-board` is the board. Main records that a different body composition is a content layout, and that a status board dropped into the collection body as ad-hoc markup fails.

A page type is the other inventory that could hold this, and it is the wrong one. A page type is a new shell. The board does not need different chrome, a primary slot, or its own loading and empty frame. Those already belong to collection. Adding a page type would duplicate that shell for a body the content-layout inventory was added to hold. `check:one-thing` reads `allowed_page_types` and expects one shell per page type. Graduating a page type would add a shell whose only difference is the body, which is the content-layout question.

The board is not a step on `approve-vendor-invoice`. Approve and Request changes stay on the invoice detail.

## Preview

Tracking, inside the app shell, on the collection page:

1. Columns are the ledger statuses: Pending (to approve), Changes requested, and Approved.
2. A card shows the invoice number as a link, the vendor, the amount, and the due date. Aging shows when a due date is near or past and the invoice is not approved.
3. The link opens the existing invoice detail. The card itself is not the control.
4. Loading, empty, and error stay in the collection shell. A column with no invoices says so.
5. To approve, All invoices, and Vendors keep the data-table content layout.

## Graduation

Applied with this proposal:

- `src/catalog/index.ts`: export `Card`
- `src/inputs/product.ts`: `allowed_content_layouts` gains `status-board`
- `src/content-layouts/status-board`: the board composition, used as the Tracking collection body

Not applied:

- `allowed_page_types` stays `collection` and `detail`
- `allowed_layouts` stays `app-shell`
- `max_steps` stays 3
