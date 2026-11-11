# Review: approve-vendor-invoice

Task: review a vendor invoice and approve it. Success state `invoice-approved`. Budget 3.

## What the checks already decided

- The queue is one collection page inside the Meridian app shell. To approve, All invoices, and Vendors reuse that shell. Opening an invoice is a link in the table. Approve is not on the queue.
- Search, filters, sort, and paging are on the collection. They are not steps on the happy path.
- Primary is Approve because the priority list ranks it 1. The detail primary slot has that one button.
- Request changes is rank 2, a secondary button. Choosing it reveals a reason. An empty reason cannot reach `changes-requested`.
- Line items sit behind one disclosure. Opening it is optional and not a step on the happy path.
- Invoice progress is a `Steps` list from the catalog: Received, Approval, Payment. It holds no control, so it adds no step, question, disclosure or target. `Steps` joined the catalog by [proposal 2026-11-11-invoice-progress-steps](../../../proposals/2026-11-11-invoice-progress-steps.md), which only adds, so `check:inventories` let it graduate in the pull request that uses it.
- Line items end in a Total row, the sum of the lines, so a reviewer can hold it against the Amount above. A test keeps each sample invoice's lines equal to its amount.
- The happy path is 2 steps: open an invoice, Approve. The task graph and the shipped reducer agree on it, and the step-budget check fails if they drift apart. Every other route to `invoice-approved` must fit too, and today the longest is the same 2 steps. `max_steps` is 3.
- Approve does not require opening Line items first. The product owner decided that on Nov 11, 2026, so a reviewer is never forced into an extra click. [Proposal 0003](../../../proposals/0003-two-step-approve.md) records it and corrects the step counts in proposal 0001.
- The flow renders loading, empty, error, ready, invoice-approved, and changes-requested. The shell stays up in each.
- The page types are collection and detail. The app shell is the frame, not a third page type. No page renders inside another.
- What a screen reader hears on each preview is declared in `features/invoice-approval/accessible-names.ts`, and `check:accessible-names` holds the app to it: the current queue link and invoice, the approved or changes-requested status message, and Approve turned off once the invoice is decided. Every control has a name.

## What the checks cannot decide

- Is an extra step earning its cost? An approval note would make the path 3, which fits the budget. That is not shipped. [Proposal 0001](../../../proposals/0001-approval-note.md) asks to require the note. It was written against a 3-step path and asks for `max_steps` 4; proposal 0003 corrects that. A human still has to say whether the note is worth the step.
- Should `max_steps` drop from 3 to 2 now that the path is 2? A tighter budget would catch one added step sooner, and would leave no room for the note. That is a proposal, not a check.
- Is the thing shown first actually what people need first? To approve shows invoice, vendor, status, amount, and due date, soonest due first. On the invoice, identity is a DataList, line items are disclosed, and Approve is the only primary. The priority list says that order. Research could still disagree.
- Does research support this split: one collection to choose an invoice, one detail page to decide? All invoices and Vendors are the same collection shell, not new page types. Request changes is a branch on the detail page, not a third page.
- Does invoice progress say what Approve hands off to, clearly enough? The list says Payment is next, with the due date, but not who pays or when the money leaves. The Status row in the facts now repeats what the list shows. Whether to drop that row is a design call, not a check. An approved invoice whose due date has passed, such as INV-1711, still shows Payment as the current stage with no overdue sign, because the sample data does not record whether a payment went out.
- What should happen when the lines do not add up to the amount? Nothing flags it today. Flagging a mismatch, or holding Approve on one, would be a new flow state, and that is a proposal.
- Did we model the states that actually happen? The six states above are the ones this journey names. A partial payment or a duplicate invoice number is not modeled.
- Should an important control aim for 44 CSS px instead of the 24 CSS px floor? The target-size check enforces the floor only.
- Should loading and the load error announce themselves? Loading renders no live region or progress bar, and the error is not an alert, so a screen reader hears either only by moving onto it. The accessible-names check compares what is declared and cannot ask for a region that is not there.

No exception is recorded in the product inputs.
