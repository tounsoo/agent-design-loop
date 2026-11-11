---
status: graduated
changes: []
adds:
  - Steps
---
# Show where an invoice is on its way to payment

Graduated in the pull request that adds it, because it only adds a member to an inventory list ([proposal 0012](0012-additions-in-one-pull-request.md)). A designer's review of that pull request is its approval.

Inventory: Meridian's component catalog, `products/meridian/catalog/index.ts`, gains Todae's `Steps`. No layout, content layout, page type, flow state, rule input, config or adapter changes. Nook's catalog does not change.

## Reason

The invoice page says what an invoice is, not where it is going. A reviewer sees Pending, Approved or Changes requested, and nothing says what Approve hands the invoice to. Accounts payable reviewers ask that question before they approve: approval is one stop between receiving an invoice and paying it, and payment is what the vendor is waiting for.

The catalog has no part for an ordered set of stages. A `DataList` row can name one status, a `Badge` can tone it, and `Alert` reports an outcome after the fact. Drawing the stages from those would be ad hoc UI the off-catalog check exists to stop, so the work needs a new catalog export. Todae's `Steps` is that part: an ordered list whose items each carry `done`, `current`, `pending` or `error`, with a hidden status word for screen readers. Its `progress` variant keeps done steps' text and draws the current one as a still marker, which fits a record that waits on people rather than work that runs.

`Steps` adds no control. It holds no button, link or field, so the step budget, the one-question cap, the disclosure caps, priority and target size read the page as before.

## States

- **Pending:** Received is done, Approval is current, and Payment, with the due date, is pending.
- **Approved:** Received and Approval are done, and Payment is current, read out as "Next".
- **Changes requested:** Received is done, Approval is marked "Changes requested", and Payment is pending.
- **Empty:** Out of scope, the list shows only on an opened invoice, and an empty queue opens none.
- **Loading:** Out of scope, while invoices load the page shows the loader in place of any invoice, so there is no list to draw.
- **Error:** Out of scope, a load error shows the error message and Try again in place of any invoice.
- **Long content:** the list always has three stages, and the longest text is "Payment due" with the due date, so it stays on one line at 1280 px and wraps inside its stage on a narrow screen.
- **Permissions:** Out of scope, Meridian models no roles, so everyone who opens an invoice sees the same list.
- **Over time:** an approved invoice whose due date has passed, such as INV-1711, still shows Payment as current with no overdue sign, because the sample data does not record whether a payment went out.

## Preview

The invoice page gets a three-stage list under its facts, labelled "Invoice progress":

| Invoice status | Received | Approval | Payment |
| --- | --- | --- | --- |
| Pending | done | current | pending |
| Approved | done | done | current, read out as "Next" |
| Changes requested | done | error, read out as "Changes requested" | pending |

The Payment stage reads "Payment due" and the invoice's due date in every state.

The Status row in the invoice's facts now says what the list's Approval stage says. This change keeps both, so the facts still answer "what is it" in one word, as the queue does, and leaves dropping the row to the designer. The review note asks the question. The Payment stage's due date repeats the facts' Due row the same way. Both stay too: the row is where the queue's soonest-due order points a reviewer, and the stage says the date is when payment is due, not when approval is.

Screenshots of the four invoice pages, and the three queue pages the change leaves alone, at 1280 by 900, before and after, are in [`products/meridian/review/screenshots/invoice-progress/`](../products/meridian/review/screenshots/invoice-progress/).

The happy path stays open an invoice, then Approve. The list is read-only and changes with the invoice's status.

## Graduation

- `products/meridian/catalog/index.ts` exports `Steps` from `@tounsoo/todae`.
- `products/meridian/features/invoice-approval/views.tsx` renders `Steps.Root variant="progress"` with three `Steps.Item`s on the detail page.
- `products/meridian/features/invoice-approval/accessible-names.ts` declares what a screen reader hears from each stage in each state, which `check:accessible-names` compares in Chrome.
- `products/meridian/features/invoice-approval/InvoiceApproval.test.tsx` checks the stage statuses before and after Approve and after a change request.
- `products/meridian/review/approve-vendor-invoice.md` records what the checks cannot decide about the list.
