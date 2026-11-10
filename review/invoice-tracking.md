# Review: invoice tracking

Tracking is a status board for the payables ledger. It is not a step on `approve-vendor-invoice`.

## What the checks already decided

- Page types stay `collection` and `detail`. `check:one-thing` hardcodes that pair. This change does not edit the check, so Tracking is the collection page on `?route=tracking`, not a new page type id.
- The frame stays `app-shell`. The nav item is Tracking.
- Card is a new catalog export. [Proposal 0002](../proposals/0002-tracking-board-card.md) records that. The board is composed from Card, Stack, ScrollArea, Text, Link, Badge, and EmptyState. The invoice number is the link. The card is not a control.
- Approve remains the only primary button. Request changes remains the one secondary button with that name. Neither is on the board.
- The happy path is still open invoice, open line items, approve. `max_steps` stays 3. Proposal 0001 stays open and is not applied.
- Loading, empty, and error still render in the shell, including on the Tracking route. A column with no cards has its own empty state.
- Drag and drop is not on the board. Moving a card would be a status change outside Approve and Request changes.

## What the checks cannot decide

- Whether Tracking should become a `board` page type once `check:one-thing` can name a third id. The board is a different composition from the filter bar and data table. Shipping it in the collection body is what the current check allows.
- Whether compact density on the board, with the rest of the shell left comfortable, is the right scan density.
- Whether aging should be measured from the real clock. The sample board uses 10 November 2026, the date the ledger was written against, so a later run does not restyle every card.
- Whether an important control should aim for 44 CSS px. The invoice link uses a 24 CSS px floor. The target-size check does not visit Tracking. The check was not edited.
