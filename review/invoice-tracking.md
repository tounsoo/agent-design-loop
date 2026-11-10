# Review: invoice tracking

Tracking is a status board for the payables ledger. It is not a step on `approve-vendor-invoice`.

## What the checks already decided

- The board is the `status-board` content layout of the collection page. [Proposal 0002](../proposals/0002-tracking-board-card.md) records that choice and the `Card` catalog export. `allowed_page_types` stays `collection` and `detail`. `allowed_layouts` stays `app-shell`.
- A page type was the other inventory that could have grown. It was rejected. Tracking uses the collection shell: one heading, a description, a body, no primary. Loading, empty, and error stay in that shell. The new composition is the body, which is what a content layout is. A new page type would have duplicated the shell.
- The frame stays `app-shell`. The nav item is Tracking. The ready body is `<StatusBoard />` with no ad-hoc children. To approve, All invoices, and Vendors stay on `data-table`.
- Approve remains the only primary button. Request changes remains the one secondary button with that name. Neither is on the board.
- The happy path is still open invoice, open line items, approve. `max_steps` stays 3. Proposal 0001 stays open and is not applied.
- Loading, empty, and error still render in the shell, including on the Tracking route. A column with no cards has its own empty state inside the content layout.
- Drag and drop is not on the board. Moving a card would be a status change outside Approve and Request changes.

## What the checks cannot decide

- Whether compact density on the board, with the rest of the shell left comfortable, is the right scan density.
- Whether aging should be measured from the real clock. The sample board uses 10 November 2026, the date the ledger was written against, so a later run does not restyle every card.
- Whether an important control should aim for 44 CSS px. The invoice link uses a 24 CSS px floor. The target-size check does not visit Tracking. The check was not edited.
- Whether `status-board` is the lasting name for this content layout. The id names the composition, the same way `data-table` does.
