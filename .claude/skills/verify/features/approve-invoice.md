# Approve an invoice

`approve-vendor-invoice` is the named task. A person opens an invoice from the table, opens Line items, and presses Approve, which is the only primary action on the page. That lands on `invoice-approved`. The task allows three steps, with no approval note and no confirm step.

## Sub-features

- `approve-open` opens an invoice's detail page from its table link, with breadcrumbs back.
- `approve-line-items` reveals the line items behind one disclosure.
- `approve-primary` makes Approve the one primary button, with Request changes secondary.
- `approve-budget` keeps the path within `max_steps` 3.

## How to get to it (user POV)

- Choose an invoice's link on To approve or All invoices, such as `Northwind Office Supply` (`?invoice=inv-1842`).
- Open `?state=ready&page=detail` from the Preview menu.

## Driving it with Vitest, the rule checks and a browser

Preconditions:

- The baseline preconditions hold, and Meridian is on To approve.

- **Journey.** Choose `Northwind Office Supply`, open `Line items`, choose `Approve`. Run `npx vitest run -t "approves after opening an invoice and its line items"`. The heading reads `Northwind Office Supply`, `Printer toner` appears under Line items, then the status `Invoice approved` shows and `Approve` is disabled.
- **Budget.** Run `npm run check:step-budget`. It prints `path (3): open-invoice → open-line-items → approve` and `within budget.`
- **Priority and disclosure.** Run `npm run check:priority` and `npm run check:disclosure`. They print `"Approve" is the primary button; "Request changes" is secondary; line items are disclosed.` and `depth ≤ 1`.
- **Browser.** Open `?invoice=inv-1842` in the preview, open `Line items`, choose `Approve`. The status `Invoice approved` shows inside the shell.

## Gotchas

- Proposal 0001 asks for an approval note and a budget of 4. It is not applied, so a change that adds a note step must fail `check:step-budget`.
- Approve from the queue or from an error state does nothing.
- The Vitest journey opens Line items by setting `open` on the `<details>` and dispatching `toggle`, not by clicking its summary. `check:target-size` clicks the summary in Chrome.
