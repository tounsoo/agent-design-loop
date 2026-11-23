# Hold a room

`hold-room` is Nook's second task. On a room's booking page, Hold room, the secondary action, keeps the room for a few minutes without booking it. That lands on `held` in two steps. The length chosen before the hold is kept, and Book room still books the held room. When the hold's minutes run out, the page shows `Hold ended`, Hold room stays off, and the room can still be booked or left with `All rooms`.

## Sub-features

- `hold-press` holds the room and keeps the length chosen.
- `hold-book` books a held room for that length.
- `hold-ends` ends the hold when its minutes run out.
- `hold-preview` keeps a `held` preview held, and ends a hold made after opening a preview.
- `hold-budget` keeps the path within `max_steps` 2.

## How to get to it (user POV)

- On a room's booking page, choose `Hold room`.
- Open `?scenario=held` for a held room, or `?scenario=expired` for a hold that ran out.

## Driving it with Vitest, the rule checks and a browser

Preconditions:

- The baseline preconditions hold, and Nook is on a room's booking page (`?scenario=booking-harbor`).

- **Hold.** Pick `90` in `How long?` and choose `Hold room`. Run `npx vitest run -t "holds a room instead of booking it"`. `Room held` shows and `How long?` still reads `90`.
- **Book a held room.** Run `npx vitest run -t "books a held room for the length chosen before the hold"`. Hold room turns `aria-disabled`, and Book room shows `Room booked` and `Harbor is yours for 30 minutes.`
- **Hold ends.** Run `npx vitest run -t "ends a hold after its minutes run out and still books the room"`, `npx vitest run -t "ends a hold made after opening a preview"` and `npx vitest run -t "keeps a held preview held"`. `Hold ended` replaces `Room held` when the minutes run out, and a `held` preview stays held.
- **Back.** Run `npx vitest run -t "goes back to the list after a hold ends"`. On `?scenario=expired`, `All rooms` opens `Book a room`.
- **Top bar.** Run `npx vitest run -t "turns the top bar off where the flow keeps the person on the page"`. On `?scenario=held`, `Rooms` and `Waitlist` are disabled.
- **Budget.** Run `npm run check:step-budget -- --config products/nook/harness.config.ts`. For `hold-room` it prints `modeled path (2): choose-room → hold` and `longest shipped flow route (2): choose-room → hold`.
- **Browser.** Open `?scenario=held` and `?scenario=expired`. Each shows the room's booking page with its status inside the top bar.

## Gotchas

- A preview never runs the hold's clock on its own, so `?scenario=held` stays held; a hold pressed after opening a preview does run out.
- Holding stays on the same page, so focus stays on `Hold room`.

## Covers

- Tasks: `hold-room`
- Scenarios: `?scenario=held`, `?scenario=expired`
