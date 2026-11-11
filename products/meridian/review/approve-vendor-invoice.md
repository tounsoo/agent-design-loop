# Review: approve-vendor-invoice

Task: review a vendor invoice and approve it. Success state `invoice-approved`. Budget 3.

## What the checks already decided

- The queue is one collection page inside the Meridian app shell. To approve, All invoices, and Vendors reuse that shell. Opening an invoice is a link in the table. Approve is not on the queue.
- Search, filters, sort, and paging are on the collection. They are not steps on the happy path.
- Primary is Approve because the priority list ranks it 1. The detail primary slot has that one button.
- Request changes is rank 2, a secondary button. Choosing it reveals a reason. An empty reason cannot reach `changes-requested`.
- Line items sit behind one disclosure. Opening it is optional and not a step on the happy path.
- The happy path is 2 steps: open an invoice, Approve. The task graph and the shipped reducer agree on it, and the step-budget check fails if they drift apart. `max_steps` is 3.
- Approve does not require opening Line items first. The product owner decided that on Nov 11, 2026, so a reviewer is never forced into an extra click. [Proposal 0003](../../../proposals/0003-two-step-approve.md) records it and corrects the step counts in proposal 0001.
- The flow renders loading, empty, error, ready, invoice-approved, and changes-requested. The shell stays up in each.
- The page types are collection and detail. The app shell is the frame, not a third page type. No page renders inside another.

## What the checks cannot decide

- Is an extra step earning its cost? An approval note would make the path 3, which fits the budget. That is not shipped. [Proposal 0001](../../../proposals/0001-approval-note.md) asks to require the note. It was written against a 3-step path and asks for `max_steps` 4; proposal 0003 corrects that. A human still has to say whether the note is worth the step.
- Should `max_steps` drop from 3 to 2 now that the path is 2? A tighter budget would catch one added step sooner, and would leave no room for the note. That is a proposal, not a check.
- Is the thing shown first actually what people need first? To approve shows invoice, vendor, status, amount, and due date, soonest due first. On the invoice, identity is a DataList, line items are disclosed, and Approve is the only primary. The priority list says that order. Research could still disagree.
- Does research support this split: one collection to choose an invoice, one detail page to decide? All invoices and Vendors are the same collection shell, not new page types. Request changes is a branch on the detail page, not a third page.
- Did we model the states that actually happen? The six states above are the ones this journey names. A partial payment or a duplicate invoice number is not modeled.
- Should an important control aim for 44 CSS px instead of the 24 CSS px floor? The target-size check enforces the floor only.

No exception is recorded in the product inputs.
