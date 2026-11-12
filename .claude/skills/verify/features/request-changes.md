# Request changes

On an invoice, Request changes is the secondary action. Choosing it reveals a required reason, and sending without one shows an error. Sending a reason lands on `changes-requested`. It is a branch, not the happy path.

## Sub-features

- `request-reveal` shows the reason field only after choosing Request changes.
- `request-required` refuses a request with no reason.
- `request-send` records the reason and lands on `changes-requested`.

## How to get to it (user POV)

- Open an invoice and choose `Request changes`.
- Open `?scenario=invoice-requesting-changes` from the Preview menu.

## Driving it with Vitest and a browser

Preconditions:

- The baseline preconditions hold, and Meridian is on an invoice (`?scenario=invoice-detail`).

- **Reveal.** Choose `Request changes`. The textbox `What should change?` appears.
- **Required.** Choose `Request changes` again with the box empty. The error `Enter what the vendor should change.` shows.
- **Send.** Type a reason and choose `Request changes`. Run `npx vitest run -t "requires a reason before requesting changes"` for all three. The status reads `Changes requested`, the reason shows, and `Approve` is disabled.
- **Priority.** Run `npm run check:priority -- --config products/meridian/harness.config.ts`. It prints `"Request changes" is secondary`.

## Gotchas

- The branch does not count toward the happy path's `max_steps`.
