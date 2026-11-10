# Proposal 0002: Export Card for invoice tracking

Status: the catalog export is applied in this change so the board can be built. A separate `board` page type is not applied.

Layer: component catalog, `src/catalog/index.ts`.

## Reason

Invoice tracking is a status board. Each invoice is one unit that sits beside others in a column: number, vendor, amount, and due date or aging. Todae's Card is that surface. Its documentation says a card is not a button or a link, so the invoice number stays a link inside the card. Stack is for spacing with no surface, which is the wrong primitive for these cards. Card is not in the catalog today.

A board is a different composition from the table collection. This change does not add a `board` page type. `check:one-thing` still requires the page types to be exactly collection and detail, and this change does not edit that check. Tracking fills the existing collection page. That keeps the page type id. Graduating a new page type here would fail the check.

The board is not a step on `approve-vendor-invoice`. Approve and Request changes stay on the invoice detail. `max_steps` stays 3.

## Preview

Tracking, inside the app shell:

1. Columns are the ledger statuses: Pending (to approve), Changes requested, and Approved.
2. A card shows the invoice number as a link, the vendor, the amount, and the due date. Aging shows when a due date is near or past and the invoice is not approved.
3. The link opens the existing invoice detail. The card itself is not the control.
4. Loading, empty, and error stay in the collection shell. A column with no invoices says so.

## Graduation

Applied with this proposal, because the board needs Card and `check:inventories` accepts the new export when this file explains it:

- `src/catalog/index.ts`: export `Card`

Not applied:

- `allowed_page_types`, `src/page-types`, and `check:one-thing` stay collection and detail. A later change can add a `board` page type only if that check is allowed to name it.
