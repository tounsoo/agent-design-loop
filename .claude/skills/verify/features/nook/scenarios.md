# Scenarios

What every Chrome check opens: `?scenario=<id>` opens one of the cases in `products/nook/flows/booking/scenarios.ts`, a modeled state with the page and room it shows, without clicking through. A booking scenario with no room is for Harbor, the first sample room. The top bar stays up in every state, and loading, no rooms and the load error render inside the rooms page. `?fail` makes the live app's load fail instead.

## Sub-features

- `scenario-states` opens loading, no-rooms, error, booked, held, expired, waitlist, waiting and freed.
- `scenario-pages` opens `rooms` and the three `booking-*` pages, each a page of `choosing`.
- `scenario-one-page` renders every scenario on exactly one page, with its state on it.
- `scenario-coverage` keeps a view and a scenario for every modeled state.

## How to get to it (user POV)

- Open a URL such as `?scenario=loading`, `?scenario=no-rooms` or `?scenario=error`.
- Open `?fail` for the live load error, then `Try again`.

## Driving it with Vitest, the rule checks and a browser

Preconditions:

- The baseline preconditions hold.

- **States.** Open `?scenario=loading`, `?scenario=no-rooms` and `?scenario=error`. They show `Loading free rooms`, the heading `No rooms are free` with `See the waitlist`, and `Couldn't load free rooms.` with `Try again`.
- **Retry.** Open `?fail` and choose `Try again`. Run `npx vitest run -t "retries after a failed load"`. `Loading free rooms` shows.
- **One page each.** Run `npx vitest run -t "renders scenario"`. Each of the 13 scenarios renders one `[data-page]` with its state.
- **Coverage.** Run `npm run check:state-coverage -- --config products/nook/harness.config.ts`. It prints `10 modeled states have views` and `13 scenarios cover every modeled state, each id once.`
- **Scenarios.** Run `npm run check:target-size -- --list --config products/nook/harness.config.ts`. It prints each scenario with its state and `target size: 13 scenarios cover 10 modeled states.` without Chrome.

## Gotchas

- Every other scenario is covered by the feature file that drives its page: [book a room](book-a-room.md), [hold a room](hold-a-room.md) and [the waitlist](waitlist.md). This file covers the states no page owns.
- `scenarios.ts` is imported in Node by the checks, so it holds data only: no JSX, CSS or `window`.

## Covers

- Scenarios: `?scenario=loading`, `?scenario=no-rooms`, `?scenario=error`
