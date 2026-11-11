---
status: graduated
changes: []
adds:
  - Steps
---
# Proposal 0014: Show where an invoice is on its way to payment

Graduated in the pull request that adds it, because it only adds a member to an inventory list ([proposal 0012](0012-additions-in-one-pull-request.md)). A designer's review of that pull request is its approval.

Inventory: Meridian's component catalog, `products/meridian/catalog/index.ts`, gains Todae's `Steps`. No layout, content layout, page type, flow state, rule input, config or adapter changes. Nook's catalog does not change.

## Reason

The invoice page says what an invoice is, not where it is going. A reviewer sees Pending, Approved or Changes requested, and nothing says what Approve hands the invoice to. Accounts payable reviewers ask that question before they approve: approval is one stop between receiving an invoice and paying it, and payment is what the vendor is waiting for.

The catalog has no part for an ordered set of stages. A `DataList` row can name one status, a `Badge` can tone it, and `Alert` reports an outcome after the fact. Drawing the stages from those would be ad hoc UI the off-catalog check exists to stop, so the work needs a new catalog export. Todae's `Steps` is that part: an ordered list whose items each carry `done`, `current`, `pending` or `error`, with a hidden status word for screen readers. Its `progress` variant keeps done steps' text and draws the current one as a still marker, which fits a record that waits on people rather than work that runs.

`Steps` adds no control. It holds no button, link or field, so the step budget, the one-question cap, the disclosure caps, priority and target size read the page as before.

## Preview

The invoice page gets a three-stage list under its facts, labelled "Invoice progress":

| Invoice status | Received | Approval | Payment |
| --- | --- | --- | --- |
| Pending | done | current | pending |
| Approved | done | done | current |
| Changes requested | done | error, read out as "Changes requested" | pending |

The Payment stage reads "Payment due" and the invoice's due date in every state.

Screenshots of the invoice page at 1280 by 900, before and after, are in [`products/meridian/review/screenshots/0014-invoice-progress/`](../products/meridian/review/screenshots/0014-invoice-progress/).

The happy path stays open an invoice, then Approve. The list is read-only and changes with the invoice's status.

## Graduation

- `products/meridian/catalog/index.ts` exports `Steps` from `@tounsoo/todae`.
- `products/meridian/features/invoice-approval/views.tsx` renders `Steps.Root variant="progress"` with three `Steps.Item`s on the detail page.
- `products/meridian/features/invoice-approval/InvoiceApproval.test.tsx` checks the stage statuses before and after Approve and after a change request.
- `products/meridian/review/approve-vendor-invoice.md` records what the checks cannot decide about the list.
