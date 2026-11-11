# Approve an invoice

`approve-vendor-invoice` is the named task in `src/inputs/product.ts`. The happy path is three steps: open an invoice, open Line items, press Approve. It lands on `invoice-approved`. `max_steps` is 3, with no approval note and no confirm step.

## Sub-features

- Detail page: breadcrumbs back to the collection, identity and amounts in a DataList.
- One disclosure, Line items.
- Approve is the only primary action.

## How to get to it (user POV)

From To approve, follow an invoice's link (as `?invoice=inv-1842`), open **Line items**, press **Approve**.

## Driving it with Vitest and the step budget

- Vitest: "approves after opening an invoice and its line items" in `InvoiceApproval.test.tsx`; `src/flows/invoice-approval/transition.test.ts` and `graph.test.ts` for the three changes and the budget.
- Checks: `check:step-budget` (path length against `max_steps`), `check:priority` (Approve primary, Request changes secondary), `check:disclosure` (one disclosure, depth 1), `lint:slots` (one primary slot on detail).
- Browser: `ready&page=detail` and `invoice-approved&page=detail`.

## Gotchas

- Proposal 0001 asks for an approval note and a budget of 4. It is not applied, so a change that adds a note step must fail `check:step-budget`.
- Approve from the queue or from an error state is ignored by the flow (`transition.test.ts`).
- The Vitest journey opens Line items by setting `open` on the `<details>` and dispatching `toggle`, not by clicking its summary. `check:target-size` clicks the summary in Chrome.
