# Review: focus on a page change, and submits that keep focus

Until this change, 21 presses in Nook changed what a screen reader could read and said nothing, or dropped focus to the page body, and `knownGaps` listed every one. Most were page changes: Rooms, Waitlist, Choose and All rooms swap the page without a URL, and nothing moved focus or said so. Now the top bar owns it, under [proposal 2026-11-12-shell-owned-focus](../../../proposals/2026-11-12-shell-owned-focus.md). It takes a required `page` prop, `rooms`, `waitlist` or `room:<id>`, and when that changes it moves focus to the h1 in `main`, so a screen reader reads the new page's title. A change inside one page, such as a hold, a booking or a hold ending, keeps its own focus.

Hold room and Book room turn themselves off once used. They now use the catalog's `submitOff`, which sets `aria-disabled` instead of `disabled`, so the button keeps focus and the status the page already shows says what happened, such as "Room held" or "Room booked".

## What the checks already decided

- `check:accessible-names` now passes 34 of 35 presses on their own. The other one, Try again on the error preview, still drops focus while the rooms load again, and `knownGaps` lists it under [issue 50](https://github.com/tounsoo/agent-design-loop/issues/50). A listed gap that stops happening fails the check.
- `submitOff` is a catalog export added under `adds`, which `check:inventories` accepts with the proposal this pull request adopts.

## What the checks cannot decide

- Whether every view maps to the right page. `pageOf` in the booking views decides it from the flow state: loading, no rooms and error are the rooms page, a chosen room is `room:<id>` through held, booked and expired, and the waitlist states are the waitlist page. A new state needs a line there, and TypeScript fails the build until it has one.
- Whether a person on a room's page expects focus to stay put when the hold ends. It does: the hold ending changes the page in place, and its alert says so.

## Screenshots

The [screenshot gallery](screenshots/shell-owned-focus/README.md) shows the held and booked previews at 1280 by 900, before and after. They look the same: an `aria-disabled` button is drawn like a `disabled` one.
