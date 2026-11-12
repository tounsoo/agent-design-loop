---
status: adopted
changes: []
adds:
  - Nav
  - room-rows
  - waitlist
  - waiting
  - freed
---
# Nook gets a Waitlist page for full rooms

Nook gains a second page a person can go to: Waitlist, the rooms that are booked for the next hour and a half, where a person joins or leaves the waitlist for each one and sees when one they wait for frees up. Three inventories grow, and every addition is new, so it is adopted in the pull request that adds it, under [proposal 0012](0012-additions-in-one-pull-request.md), and a designer's review of that pull request is its approval:

- the catalog exports gain `Nav`, Todae's navigation landmark, so the top bar can switch between Rooms and Waitlist;
- `allowed_content_layouts` gains `room-rows`, a new composition at `products/nook/content-layouts/room-rows/`: one row per room, its name and facts on the left and its one action at the row's end;
- the flow states in `products/nook/flows/booking/states.ts` gain `waitlist`, `waiting` and `freed`.

Rule or input: no task, `max_steps`, priority, disclosure, cap, layout, page type, config field or adapter field changes. The Waitlist page is a second page of the existing `rooms` page type, which the config already names a collection, so its body is checked as a collection body and it holds no primary action.

## Reason

When every room is taken, Nook says "No rooms are free" and stops there. When some are taken, the full ones are not on screen at all. A person who needs a room now has nothing to do but reload. A waitlist gives them one action and lets Nook tell them when a room frees up, which is a state that changes over time without anything the person does.

Why `rooms`, not a new page type: the waitlist is a list of rooms that holds no primary action, which is what the `rooms` shell already is: a title, an intro and a list. A new page type would also need its own entry in `shells.collections`, a config change that takes two pull requests, and its shell would be a copy of this one.

Why a new content layout, not `room-cards`: room cards are an offer, each free room with Choose under it, read as a gallery. On the waitlist each row's action changes as the person acts (Join waitlist, Leave waitlist, then Choose when it frees), so the rows sit in one column with every action at the same edge, where the eye can run down them. Rows also tell full rooms apart from free ones at a glance.

Why `Nav`: until now Nook did one job on one page and needed no navigation. Two places to go need a navigation landmark, and the catalog's own part gives it the name and landmark a screen reader lists.

Why three flow states: each one says something different and has its own preview. `waitlist` is the page with no room joined. `waiting` is the page once the person waits for at least one room, and the status says which. `freed` is the page after a room they wait for frees up. Leaving and coming back keeps the rooms they wait for.

## States

- **Waitlist:** the page with two full rooms, Cedar and Birch, each with Join waitlist. The status region is empty, and after leaving the last room it says "You left the waitlist for Cedar."
- **Waiting:** the person waits for one room or more. The status region says "You're on the waitlist for Cedar. If a room frees up, it shows here.", naming each room ("Cedar and Birch"), and those rows offer Leave waitlist.
- **Freed:** a room they wait for freed up. The status region says "Cedar is free now. Choose it to book it.", its row offers Choose, which opens its booking page, and the other rows keep their own action.
- **Booking a freed room:** the booking page for Cedar, the same as choosing any free room, and Book room books it.
- **Empty:** Out of scope, Nook's full rooms are fixed sample data with two rooms, so the waitlist is never empty here. A live list would say "No rooms are full" in the list, the way the Rooms page says "No rooms are free".
- **Loading:** the full rooms come with the free rooms in Nook's one load, so while it loads the Waitlist link in the top bar is turned off and the Rooms page shows its loader.
- **Error:** the same load's error. Waitlist stays turned off, and the Rooms page shows the error with Try again.
- **Long content:** a long room name wraps inside its row, and the row's action keeps its width at the row's end, or drops under the name when the row is too narrow for both.
- **Permissions:** Out of scope, Nook has no accounts, so anyone who can book a room can wait for one.
- **Over time:** while the person is on the Waitlist page, the first room they wait for frees up after a while (30 seconds in this demo, standing in for someone cancelling) and the page moves from Waiting to Freed. A preview opened from the URL never frees a room. A freed room stays offered until the person chooses it or leaves the page.

"No rooms are free" gains See the waitlist, a secondary button, since it is where a person most needs one. The top bar shows on every state: Rooms and Waitlist, with the current page marked for a screen reader. Both are turned off where the flow already locks the page (loading, error, a held or booked room), the same as All rooms.

## Preview

The Waitlist page at `?state=waitlist`, `?state=waiting` and `?state=freed`:

- The top bar: Nook, then Rooms and Waitlist as two ghost buttons in a navigation landmark, the current one underlined and marked current for a screen reader.
- The title "Waitlist" and the intro "Rooms booked for the next hour and a half. Join a waitlist and you'll see here when one frees up."
- One status region over the rows, which says what just changed: which rooms the person waits for, that one freed up, or that they left one.
- Two rows, `room-rows`: Cedar (Floor 1, Seats 6) and Birch (Floor 3, Seats 10), each with one secondary action: Join waitlist, Leave waitlist or Choose, named for its room for a screen reader, such as "Join the waitlist for Cedar".
- No primary action on the page.

Shown twice: the status says which rooms the person waits for, and each of those rows offers Leave waitlist. The row's action stays, because it is where the person acts; the status stays because it is what a screen reader announces when the list changes. Neither row shows a "Waiting" badge, which would repeat both.

The first line `check:inventories` prints on the pull request that adds it:

```
inventory: allowed_content_layouts changed from ["room-cards"] to ["room-cards","room-rows"]. Adopts proposals/2026-11-12-nook-waitlist.md (only adds, so it is adopted in the pull request that adds it, which a designer reviews).
```

The catalog exports and the flow states each print the same kind of line.

The gallery at `products/nook/review/screenshots/waitlist/` shows the Rooms page before and after the top bar gained its navigation, and the three Waitlist previews after.

## Adoption

`products/nook/catalog/index.ts` exports `Nav`. `products/nook/inputs.ts` adds `room-rows` to `allowed_content_layouts`, and `products/nook/content-layouts/room-rows/` is the new composition. `products/nook/flows/booking/states.ts` adds `waitlist`, `waiting` and `freed` to `modeledStates`, the two full rooms, the rooms a person waits for on every state, and the events `open-waitlist`, `open-rooms`, `join-waitlist`, `leave-waitlist` and the system event `room-freed`. `transition.ts` handles them, `shipped.ts` lists the person's new events and `room-freed` as a system event, and `Booking.tsx` sends `room-freed` after `FREE_UP_SECONDS` on the Waitlist page, except on a preview opened from the URL. `layouts/top-bar/TopBar.tsx` takes the navigation, `features/booking/views.tsx` renders the top bar and the Waitlist page, `App.tsx` stops rendering the top bar itself, `preview/readPreview.ts` opens the three new states, and `accessible-names.ts` declares what a screen reader hears on each, the top bar included. `App.test.tsx` covers joining, leaving, a room freeing up and booking it. A review note, `products/nook/review/waitlist.md`, records what the checks leave open.
