# Review: approve-vendor-invoice

Task: review a vendor invoice and approve it. Success state `invoice-approved`. Budget 3.

## What the checks already decided

- The queue is one collection page inside the Meridian app shell. To approve, All invoices, and Vendors reuse that shell. Opening an invoice is a link in the table. Approve is not on the queue.
- Search, filters, sort, and paging are on the collection. They are not steps on the happy path.
- Primary is Approve because the priority list ranks it 1. The detail primary slot has that one button.
- Request changes is rank 2, a secondary button. Choosing it reveals a reason. An empty reason cannot reach `changes-requested`.
- Line items sit behind one disclosure. That open is a step on the happy path, not a second primary. The lines are a bill: description, quantity, unit price, amount, GL account, and cost center. The header stays outside that disclosure.
- The shortest path that opens an invoice, opens line items, and approves is 3 steps. `max_steps` is 3.
- The flow renders loading, empty, error, ready, invoice-approved, and changes-requested. The shell stays up in each.
- The page types are collection and detail. The app shell is the frame, not a third page type. Each page shell appears once.

## What the checks cannot decide

- Is an extra step earning its cost? An approval note would make the path 4. That is not shipped. [Proposal 0001](../proposals/0001-approval-note.md) asks to raise the budget to 4 and require the note. A human still has to say whether the note is worth the step.
- Is the thing shown first actually what people need first? To approve shows invoice, vendor, status, amount, and due date, soonest due first. On the invoice, the header DataList leads with vendor, invoice number, status, and total, then the dates, PO number, terms, billing entity, and submitter a reviewer matches. Quantity, unit price, GL account, and cost center stay on the lines, behind the one disclosure. The priority list says that order. Research could still want the coding visible before the disclosure opens, or a different field order. A second disclosure for coding would break the cap, so that question stays here.
- Does research support this split: one collection to choose an invoice, one detail page to decide? All invoices and Vendors are the same collection shell, not new page types. Request changes is a branch on the detail page, not a third page.
- Did we model the states that actually happen? The six states above are the ones this journey names. A partial payment or a duplicate invoice number is not modeled.
- Should an important control aim for 44 CSS px instead of the 24 CSS px floor? The target-size check enforces the floor only.

No exception is recorded in the product inputs.
