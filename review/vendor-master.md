# Review: vendor master record

Opening a vendor from Vendors uses the detail page type. It is not a step on `approve-vendor-invoice`. The happy path stays open invoice, open line items, Approve. `max_steps` stays 3. [Proposal 0001](../proposals/0001-approval-note.md) stays open and unapplied.

## What the checks already decided

- The page types stay collection and detail. The vendor record is the detail shell, not a new page type. The app shell stays the frame.
- One `DetailPage` in the feature source. Invoice detail still fills its primary slot with Approve. The vendor record does not render that slot.
- Request changes stays the one secondary button, on the invoice. The vendor record has no page-level action. Nothing in the product priority list ranks one for a vendor.
- Line items stay the one disclosure, on the invoice. The vendor's invoices are a table in the body, so the disclosure count stays at one.
- The vendor name is a link in the name cell. The table row has no click handler.
- Legal name matches `Invoice.vendor`, so the record and the ledger name the same supplier.

## What the checks cannot decide

- Is the thing shown first what people need first? The record shows commercial identity, then that vendor's invoices. Identity is the master data. The invoices are how you leave this page and reach Approve. Research could still want a different order.
- Outstanding balance is the sum of this vendor's invoices that are not approved (pending and changes requested). Approved invoices stay on the record and drop out of the balance. The Vendors collection still counts only pending invoices as open. Those two definitions are related and not the same.
- Invoices are ordered by due date, soonest first, matching the queue. A vendor has few invoices, which is a plain table rather than the filter-bar collection. The invoice number links to the existing invoice detail. When that link is followed, the breadcrumb can return to this vendor. The approval path from To approve does not gain that crumb.
- Does research support grouping identity and invoices on one detail page? The product asked for both on the vendor record. They are one supplier, not two questions on the approval task.
- No ranked action belongs on the vendor. A later primary, such as paying the vendor, would be a proposal. It is not invented here.
