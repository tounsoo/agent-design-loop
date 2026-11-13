# Book a room

`book-room` is Nook's main task. The rooms list shows each free room as a card; choosing one opens its booking page, where a person picks how long and presses Book room, the page's one primary action. That lands on `booked` in two steps, and the page locks: Book room and Hold room are disabled, and the status says what was booked.

## Sub-features

- `book-choose` opens a room's booking page from its card, with focus on the room's name.
- `book-length` picks how long in the `How long?` select.
- `book-primary` makes Book room the one primary button, with Hold room secondary.
- `book-details` keeps the room's equipment behind the one `Room details` disclosure.
- `book-back` goes back to the rooms list with `All rooms`.
- `book-budget` keeps the path within `max_steps` 3, a hold first included.

## How to get to it (user POV)

- Open `/` for the rooms list (`Book a room`) and choose a room, such as `Choose Lantern`.
- Open `?scenario=rooms` for the list, or `?scenario=booking-harbor`, `?scenario=booking-lantern` or `?scenario=booking-quarry` for a room's booking page.

## Driving it with Vitest, the rule checks and a browser

Preconditions:

- The baseline preconditions hold, and Nook is on the rooms list.

- **Journey.** Choose `Choose Lantern`, pick `90` in `How long?`, choose `Book room`. Run `npx vitest run -t "loads the free rooms, books one, and locks the page"`. The heading `Lantern` gets focus, then `Lantern is yours for 1 hour 30 minutes.` shows, both buttons are `aria-disabled`, and focus stays on `Book room`.
- **Focus.** Run `npx vitest run -t "moves focus to the new page's title on every page change, and not on the first page"`. Each page change moves focus to its title; the first page and a hold keep it where it is.
- **Back.** Run `npx vitest run -t "goes back from a room to the list"`. `All rooms` opens `Book a room`.
- **Budget.** Run `npm run check:step-budget -- --config products/nook/harness.config.ts`. For `book-room` it prints `modeled path (2): choose-room → book` and `longest shipped flow route (3): choose-room → hold → book`, then `step budget: within budget.`
- **Priority and disclosure.** Run `npm run check:priority -- --config products/nook/harness.config.ts` and `npm run check:disclosure -- --config products/nook/harness.config.ts`. They print `priority: "Book room" is the primary button on 1 of 3 pages; "Hold room" is secondary; disclosed: "Room details".` and `disclosure: depth ≤ 1 and at most 1 per page, across 3 pages.`
- **Browser.** Open `?scenario=rooms`, `?scenario=booking-lantern` and `?scenario=booked`. The list shows a card per free room, the booking page shows the room's facts, `How long?`, a closed `Room details` and `Book room`, and Booked shows the `Room booked` status with both buttons disabled.

## Gotchas

- The rooms list is the `rooms` page type, a collection with its title and intro as chrome and the `room-cards` content layout in its list. The booking page is the `booking` page type, whose primary slot is `Action`; its body is the `select-question` and `room-details` content layouts.
- A booking that follows a hold is the task's longest route, three steps, so `max_steps` 3 is reached exactly. A reducer that added a step to it fails `check:step-budget`.
- The top bar (`top-bar`) turns its `Rooms` and `Waitlist` buttons off while the flow keeps the person on the page: loading, error, held and booked.

## Covers

- Page types: `rooms`, `booking`
- Layouts: `top-bar`
- Content layouts: `room-cards`, `select-question`, `room-details`
- Tasks: `book-room`
- Scenarios: `?scenario=rooms`, `?scenario=booking-harbor`, `?scenario=booking-lantern`, `?scenario=booking-quarry`, `?scenario=booked`
