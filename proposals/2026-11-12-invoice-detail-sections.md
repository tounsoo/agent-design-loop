---
status: adopted
changes: []
---
# Add vendor and activity sections to the invoice page

A record, not a request. The change fits the inventories: it uses catalog exports, a page type and a disclosure Meridian already has, and it adds no catalog export, layout, content layout, page type, flow state or rule input. So it gates nothing, and it starts as adopted. It is written down so a designer can review the states and the crowding before the page grows again.

## Reason

A reviewer approving an invoice wants three things the page does not show: what each line costs per unit, where the money goes and on what terms, and what has already happened to the invoice. Without them they leave the page for the vendor directory or ask someone.

The page also serves as a test of the loop. Each section adds content to a detail page whose rules cap disclosures at one, questions at one and primary actions at one. The point is to see which checks notice a page that gets busier.

## States

- **Pending:** the line items table gains Quantity and Unit price. The Vendor card shows the remittance email, payment terms, open invoices and the approved total. Open means awaiting approval, as on the Vendors page, so it counts this invoice while it waits. The Activity card lists Received and Sent for approval with their dates.
- **Approved:** the Activity card ends with Approved. A decision made in this session, or forced by a preview, reads Today, because the sample data has no date for it. The Vendor card's open count drops by one and its approved total rises by this invoice's amount.
- **Changes requested:** the Activity card ends with Changes requested, dated, without the reason. The reason stays in the alert above, so it shows once. The invoice leaves the Vendor card's open count, as it leaves To approve.
- **Requesting changes:** the reason field stays last in the body, right above Request changes.
- **Empty:** an invoice with no lines says "This invoice has no line items." inside the disclosure. A vendor the registry does not hold says it has no vendor record, so its email and terms are not on file. Activity is never empty, because every invoice has its receipt.
- **Loading:** Out of scope, the sections arrive with the invoice in the one load, and while it loads the page shows the loader in place of any invoice.
- **Error:** Out of scope, a load error shows the error message and Try again in place of any invoice, so no section can fail on its own.
- **Long content:** a long remittance email breaks anywhere inside its row, because the catalog's `DataList` details already wrap that way, rather than truncating. Many lines grow the line items table inside its disclosure, and a long activity grows its table. The page scrolls, and the action row stays at the bottom of the view, so Approve is never pushed below the fold. The scrolling panel keeps room for the row, so a focused field, such as the reason, never sits under it.
- **Permissions:** Out of scope, Meridian has no sign-in or roles, so everyone who opens an invoice sees the same sections.
- **Over time:** Today stays Today, because there is no clock in the sample data, and a decision made in the session is not stored in the activity: the page adds the Today row from the invoice's status each time it opens. The vendor's counts follow the ledger, so approving another of the vendor's invoices in the session changes them.

## Preview

The invoice page, top to bottom: breadcrumbs, the vendor name, the facts, invoice progress, the outcome alert when there is one, Line items (closed), the Vendor card, the Activity card, the reason field on the request branch, then the action row with Request changes and Approve.

What the page now says twice, and which stays:

- The vendor's name is the page heading and a row in the facts. The Vendor card does not repeat it.
- Activity's Received and Sent for approval restate the first stage of invoice progress, with dates. Both stay: progress says where the invoice is going, activity says when things happened. Dropping one is the designer's call.
- Activity's last row restates the outcome alert's title. The alert speaks when the decision is made; the row is the record. The reason is only in the alert.
- The Due row and the Payment stage already repeated each other before this change.

Measured by hand in the gate's headless Chrome at 1280 by 900, not by a check: with the three sections, Approve's top edge moved from 539 px to 924 px on the ready preview, below the fold, and to 1075 px on the request branch. No check failed. The action row is now held at the bottom of the view while the page scrolls, and Approve's top edge sat at 834 px on every invoice preview. Screenshots are in the gallery the pull request links. They show the first 900 px only, so the request branch's shot now looks like the ready one: its reason field is below the fold, behind the action row.

## Adoption

- `products/meridian/flows/invoice-approval/states.ts` gives each line a quantity and each invoice its dated activity, with `unitPrice` and `shownActivity`.
- `products/meridian/flows/invoice-approval/vendors.ts` adds `vendorSummary`.
- `products/meridian/features/invoice-approval/views.tsx` renders the wider line items table, the Vendor card and the Activity card.
- `products/meridian/features/invoice-approval/accessible-names.ts` declares the two sections and the activity row each detail preview ends on.
- `products/meridian/styles.css` holds the detail page's action row at the bottom of the view, and keeps room for it when the panel scrolls a field into view.
- `products/meridian/flows/invoice-approval/vendors.ts` gives Harbor & Pine Catering Net 30, because its invoices fall due 30 days after receipt and the Vendor card would otherwise say Due on receipt beside them. A test holds every sample invoice's due date to its vendor's terms.
- `products/meridian/review/approve-vendor-invoice.md` records what the checks cannot decide about the busier page.
