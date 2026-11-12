---
status: adopted
changes: []
adds:
  - Badge
---
# Nook's room page shows later bookings, the waitlist and amenities

A room's booking page gains two sections: Later today, the times the room is booked after the next hour and a half with how many people wait for them, and Amenities, what the room offers beyond its equipment. One inventory grows, and the addition is new, so it is adopted in the pull request that adds it, under [proposal 0012](0012-additions-in-one-pull-request.md), and a designer's review of that pull request is its approval:

- the catalog exports gain `Badge`, Todae's short static label, one per amenity.

Rule or input: no task, `max_steps`, priority, disclosure, cap, layout, content layout, page type, flow state, config field or adapter field changes. Both sections sit in the `booking` page type's existing `Body` slot, so the page keeps its one question (How long?), its one disclosure (Room details) and its one primary action (Book room).

## Reason

The booking page says where a room is and how many it seats, and nothing about the rest of the person's day in it. Someone booking Harbor for an hour can't see that it is booked again at 1:00 PM, that two people wait for that slot, or that it has step-free access, without leaving Nook to ask. Each of these helps decide whether to book this room or pick another, which is the page's one job.

Why a section in the body, not a new layout or page type: the page is still one room being booked. The `booking` shell's `Body` slot already holds the status and the question, and a section with a heading is plain text the catalog's `Text` and `Stack` already draw. A new layout would change Nook's frame, and a new page type would also need a `shells.primarySlots` entry, a config change that takes two pull requests.

Why `Badge`: amenities are short labels a person scans, not sentences. Todae's `Badge` is a static label with no role, so the list around it gives a screen reader the count, and the badges wrap onto more lines when a room has many.

Why not behind Room details: Room details is the page's one disclosure (`MAX_DISCLOSURES_PER_PAGE` is 1), and it holds the equipment, which a person checks after choosing. Later bookings bear on how long to book, and amenities such as step-free access can rule a room out, so both stay visible.

Why Later today holds the waitlist count: the people who wait are waiting for those booked times. A section of its own for one sentence would be a heading over a number.

## States

- **Choosing:** the booking page for Harbor: How long?, then Later today with "1:00 PM to 2:00 PM" and "3:30 PM to 4:30 PM" and the line "2 people are waiting in case these times free up.", then Amenities with Natural light and Step-free access, then Room details.
- **Held, booked and hold ended:** the same two sections under the status, unchanged, since a hold or a booking changes neither the room's later bookings nor its amenities.
- **Booking a freed room:** Cedar's page, chosen from the Waitlist page, shows Cedar's own later bookings, its waitlist count and its amenities.
- **Empty:** a room with no later bookings, such as Quarry, says "Free for the rest of the day." and shows no waitlist line, since there is nothing to wait for. A room with later bookings that no one waits for says "No one is waiting in case these times free up." A room with no amenities says "No amenities listed."
- **Loading:** each room's later bookings, waitlist count and amenities come with the rooms in Nook's one load, so the booking page never opens before them. While the load runs, the Rooms page shows its loader and the top bar is turned off.
- **Error:** the same load's error. The Rooms page shows it with Try again, and no booking page opens, so neither section has an error of its own.
- **Long content:** a busy room, such as Lantern, lists every booking left today, one line each; a working day holds few enough that the list needs no cap. Amenity badges wrap onto more lines. A badge does not wrap its own text: an amenity name wider than the page is cut with an ellipsis, though a screen reader still reads it whole, so amenity names stay short.
- **Permissions:** Later today shows only the times, never who booked the room or what for, because anyone who can open the page can read it.
- **Over time:** the times are read once, with the load. A booking that ends while the page is open stays listed until the next load, and the waitlist count does not move while the person looks. Live times and a live count are out of scope for this demo.

## Preview

The booking page at `?scenario=booking-harbor`, top to bottom:

- All rooms, the title Harbor and the facts "Floor 2 · Seats 4", as now.
- The status region, empty while choosing, and How long?, as now.
- Later today, an `h2`, then one line per booked time, "1:00 PM to 2:00 PM" and "3:30 PM to 4:30 PM", as a list, then the muted line "2 people are waiting in case these times free up."
- Amenities, an `h2`, then a list of neutral badges, Natural light and Step-free access, side by side.
- Room details, the disclosure, still closed, still holding the equipment: Screen and Whiteboard.
- Hold room and Book room, as now. Book room is still the one primary action.

Shown twice: the facts line already says the floor and the seats, so Amenities leaves them out, and Room details already lists the equipment, so Amenities lists only what is not equipment. The status region already says a room is held or booked, so Later today does not add the person's own booking to its list.

The first line `check:inventories` prints on the pull request that adds it:

```
inventory: catalog exports changed from ["Alert","Button","Card","Disclosure","EmptyState","Field","Label","Loader","Nav","Stack","Text","ThemeProvider"] to ["Alert","Badge","Button","Card","Disclosure","EmptyState","Field","Label","Loader","Nav","Stack","Text","ThemeProvider"]. Adopts proposals/2026-11-12-nook-room-detail-sections.md (only adds, so it is adopted in the pull request that adds it, which a designer reviews).
```

The gallery at `products/nook/review/screenshots/room-detail-sections/` shows the four booking previews (choosing, held, booked and hold ended) and the Rooms page, before and after.

## Adoption

`products/nook/catalog/index.ts` exports `Badge`. `products/nook/flows/booking/states.ts` gives each of its five sample rooms its `laterToday` times, its `waitlistCount` and its `amenities`. `products/nook/features/booking/views.tsx` renders Later today and Amenities in the booking page's `Body`, `accessible-names.ts` declares their headings on the booking preview, and `App.test.tsx` covers a room with later bookings, one with none, and one whose bookings no one waits for. A review note, `products/nook/review/room-detail-sections.md`, records what the checks leave open.
