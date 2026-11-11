# Request changes

On an invoice, **Request changes** is secondary. Choosing it reveals a required reason. Sending the request lands on `changes-requested`. It is a branch, not the happy path.

## Sub-features

- The reason field appears only after choosing Request changes.
- Sending without a reason is refused.

## How to get to it (user POV)

Open an invoice, press **Request changes**, type a reason, send it.

## Driving it with Vitest and the browser

- Vitest: "requires a reason before requesting changes" in `InvoiceApproval.test.tsx`; "requests changes only after a reason" in `transition.test.ts`.
- Checks: `check:priority` fails Request changes shown as primary.
- Browser: `ready&page=detail&branch=request` and `changes-requested&page=detail`.

## Gotchas

- The branch does not count toward the happy path's `max_steps`.
