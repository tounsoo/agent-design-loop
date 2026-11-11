# Approve an invoice

`approve-vendor-invoice` is the named task. A person opens an invoice from the table and presses Approve, which is the only primary action on the page. That lands on `invoice-approved` in two steps. Opening Line items is optional and not counted. The task allows three steps, with no approval note and no confirm step.

## Sub-features

- `approve-open` opens an invoice's detail page from its table link, with breadcrumbs back.
- `approve-line-items` reveals the line items behind one disclosure, an optional step.
- `approve-primary` makes Approve the one primary button, with Request changes secondary.
- `approve-budget` keeps the path within `max_steps` 3.

## How to get to it (user POV)

- Choose an invoice's link on To approve or All invoices, such as `Northwind Office Supply` (`?invoice=inv-1842`).
- Open `?state=ready&page=detail` from the Preview menu.

## Driving it with Vitest, the rule checks and a browser

Preconditions:

- The baseline preconditions hold, and Meridian is on To approve.

- **Journey.** Choose `Northwind Office Supply`, then `Approve`. Run `npx vitest run -t "approves in two steps, with Line items left closed"`. Line items stay closed, and the status `Invoice approved` shows.
- **Line items.** Choose `Northwind Office Supply`, open `Line items`, choose `Approve`. Run `npx vitest run -t "approves after opening an invoice and its line items"`. The heading reads `Northwind Office Supply`, `Printer toner` appears under Line items, then the status `Invoice approved` shows and `Approve` is disabled.
- **Budget.** Run `npm run check:step-budget`. It prints `modeled path (2): open-invoice → approve`, the same `shipped path (2)`, and `within budget.`
- **Priority and disclosure.** Run `npm run check:priority` and `npm run check:disclosure`. They print `"Approve" is the primary button; "Request changes" is secondary; disclosed: "Line items".` and `depth ≤ 1`.
- **Browser.** Open `?invoice=inv-1842` in the preview and choose `Approve`. The status `Invoice approved` shows inside the shell.

## Gotchas

- The task graph and the reducer both give `open-invoice → approve`. `check:step-budget` fails if either goes over `max_steps` or the two stop matching, so a reducer that starts requiring Line items fails.
- Proposal 0001 asks for an approval note. It is not applied. Proposal 0003 corrects its counts: with a note the path would be 3, inside the budget, so adding a note step to both the graph and the reducer would pass `check:step-budget`. The proposal, not the check, keeps the note out.
- Approve from the queue or from an error state does nothing.
- The Vitest journey opens Line items by setting `open` on the `<details>` and dispatching `toggle`, not by clicking its summary. `check:target-size` clicks the summary in Chrome.
