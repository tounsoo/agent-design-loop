# Critique

Round 1, by Sonnet, which did not build the change: pass, with 3 for the review note. Written by `npm run critique` from the critic's findings on this folder's screenshots. It is advisory: no check reads it.

## For the review note

- **Grouping** (`after/ready--page-detail.png`, `after/ready--page-detail--branch-request.png`): The invoice detail page shows the vendor name twice, as the page title and again as the Vendor field, and the invoice number twice, in the breadcrumb and as the Invoice field. The same is true in the base, so the change does not make it worse. Fix: Drop the Vendor row from the facts list, or give the title a different job such as the invoice number.
- **Hierarchy** (`after/ready--route-vendors.png`): Vendor card names are large and bold, close to the page title in weight, and the label and value rows inside each card repeat at near-equal weight. The page reads as a wall of similar blocks. The base looks the same. Fix: Step the card names down a size and quiet the labels so the Vendors title clearly leads.
- **Hierarchy** (`after/ready--page-collection.png`, `after/ready--route-invoices.png`): The small table caption (Invoices to approve, Invoices) repeats the page title and sits just left of the table edge, so it adds little and looks slightly misaligned. The base has it too. Fix: Visually hide the caption or align it to the table edge.
