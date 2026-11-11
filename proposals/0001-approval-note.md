---
status: open
changes:
  - max_steps
  - approve-vendor-invoice
---
# Proposal 0001: Require an approval note

An open request. Not applied.

Layer: flow model and the `approve-vendor-invoice` step budget.

## Reason

Approve currently applies on the next step after the reviewer has opened the invoice and its line items. An approval note would record why accounts payable accepted the vendor invoice. Whether that note earns its cost is a review question. The step-budget check cannot answer it, and the agent must not raise `max_steps` on its own.

The shipped happy path is 3 steps, which is the budget. Requiring a note makes it 4. This proposal asks to raise the budget and graduate the pattern. The shipped invoice does not ask for a note, and it does not confirm before approve.

## Preview

Shipped path (within budget):

1. Open an invoice from the queue
2. Open Line items
3. Approve → `invoice-approved`

Proposed path:

1. Open an invoice from the queue
2. Open Line items
3. Write an approval note
4. Approve → `invoice-approved`

The note would be required before Approve. The detail primary slot would still hold one button.

## Graduation, after approval

- `src/inputs/product.ts`: `max_steps` for `approve-vendor-invoice` from 3 to 4
- `src/flows/invoice-approval`: Approve is legal only after a non-empty note is on the detail state
- No new catalog component. The note uses `Field.Textarea`, which is already in the catalog

Until that lands, the budget stays 3 and the approval note stays out of the UI.
