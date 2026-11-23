# The waitlist

The top bar's `Waitlist` opens a list of the rooms booked for the next hour and a half, each with a button to join or leave its waitlist. The status says which rooms the person waits for. When a room they wait for frees up, the list says so, and choosing it opens its booking page. The person's place on the waitlist stays when they go back to the rooms.

## Sub-features

- `waitlist-open` opens the waitlist from the top bar, or from `See the waitlist` when no rooms are free, and goes back to where it opened from.
- `waitlist-join-leave` joins and leaves a room's waitlist, moving focus to the button that replaces the one pressed, and says which rooms the person waits for.
- `waitlist-keep` keeps the person's place when they go back to the rooms.
- `waitlist-freed` frees a room the person waits for and books it from the waitlist.

## How to get to it (user POV)

- Choose `Waitlist` in the top bar, or `See the waitlist` on `No rooms are free`.
- Open `?scenario=waitlist`, `?scenario=waiting` or `?scenario=freed`.

## Driving it with Vitest and a browser

Preconditions:

- The baseline preconditions hold, and Nook is on the rooms list.

- **Join and leave.** Choose `Waitlist`, then `Join waitlist for Cedar` and `Join waitlist for Birch`. Run `npx vitest run -t "joins and leaves a waitlist, and says which rooms the person waits for"`. Focus moves to `Leave waitlist for Cedar`, and the status reads `You're on the waitlist for Cedar and Birch.`, then `You left the waitlist for Birch.` once both are left.
- **Keep the place.** Run `npx vitest run -t "keeps the person's place on the waitlist when they go back to the rooms"` and `npx vitest run -t "keeps a waiting preview waiting"`.
- **A room frees up.** Run `npx vitest run -t "frees a room the person waits for, and books it from the waitlist"` and `npx vitest run -t "says so when the person leaves a waitlist while a room is free"`. The status reads `Cedar is free now.`, `Choose Cedar` opens its page, and `Book room` shows `Cedar is yours for 1 hour.`
- **From no rooms.** Run `npx vitest run -t "opens the waitlist from No rooms are free"`. `See the waitlist` opens it, and `Rooms` goes back to `No rooms are free`.
- **Browser.** Open `?scenario=waitlist`, `?scenario=waiting` and `?scenario=freed`. Each shows `Waitlist` with a row per booked room inside the top bar; Waiting and Freed say in the status which rooms the person waits for or which one is free.

## Gotchas

- The waitlist is a `rooms` page with the `room-rows` content layout in its list, not a page type of its own.
- The flow frees a room only on the waitlist page, and only one the person waits for, and it ignores joining a free room's waitlist or choosing a full room from the rooms list (`npx vitest run -t "only frees a room on the waitlist page, and only one the person waits for"`, `npx vitest run -t "does not join a free room's waitlist or choose a full room from the room list"`).
- [Proposal 2026-11-12-nook-waitlist](../../../../../proposals/2026-11-12-nook-waitlist.md) records it.

## Covers

- Content layouts: `room-rows`
- Scenarios: `?scenario=waitlist`, `?scenario=waiting`, `?scenario=freed`
