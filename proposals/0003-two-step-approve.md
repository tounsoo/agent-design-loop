---
status: adopted
changes: []
---
# Proposal 0003: Record the approve path as 2 steps

Decided, and graduated with its own pull request. This records a decision, not a request to grow an inventory, so nothing graduates later.

Rule or input: none of the inventories change. `max_steps` for `approve-vendor-invoice` stays 3. What changes is the task graph, which is not an inventory, the step-budget rule in `scripts/check-step-budget.ts`, and the step counts that [proposal 0001](0001-approval-note.md) is written against. Proposal files are not edited after they merge, so this file corrects 0001 instead.

## Reason

Proposal 0001 says Approve applies after the reviewer has opened the invoice and its line items, and that the shipped happy path is 3 steps: open an invoice, open Line items, Approve. Both are wrong. The shipped reducer has never required Line items before Approve. Its shortest path is 2 steps: open an invoice, Approve. The task graph assumed the third step, and `review/approve-vendor-invoice.md` left open whether Approve should require it.

The product owner decided it should not. Forcing a reviewer to open Line items before every Approve adds a click without a check behind it. Line items stay behind their disclosure, one optional look away. So the task graph now models the path that ships, and `check:step-budget` fails when the graph and the reducer are not the same steps.

That changes the arithmetic in proposal 0001. A required approval note makes the path 3 steps, not 4, and 3 fits the current `max_steps`.

## Preview

Shipped path, and now the modeled path (within budget 3):

1. Open an invoice from the queue
2. Approve → `invoice-approved`

Opening Line items is allowed at any point before Approve. It is not counted.

Proposal 0001's path, corrected:

1. Open an invoice from the queue
2. Write an approval note
3. Approve → `invoice-approved`

## Adoption

- No file changes on approval. The files below change in the same pull request as this proposal, because none of them is an inventory:
  - `src/flows/invoice-approval/graph.ts` models open-invoice → approve.
  - `scripts/check-step-budget.ts` also fails when the modeled and shipped paths are not the same steps.
- `max_steps` for `approve-vendor-invoice` stays 3. Lowering it to 2 would be a separate proposal.
- If proposal 0001 is approved, its graduating change should not raise `max_steps` to 4. The corrected note path is 3 steps and fits. The note itself still needs a person to say it earns its step.
