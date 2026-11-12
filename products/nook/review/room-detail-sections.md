# Review: more on a room's booking page

A room's booking page gains two sections between How long? and Room details: Later today, the times the room is booked after the next hour and a half with how many people wait for them, and Amenities, what the room offers beyond its floor, seats and equipment, as badges. The data comes with each room in Nook's one load. [Proposal 2026-11-12-nook-room-detail-sections](../../../proposals/2026-11-12-nook-room-detail-sections.md) adds `Badge` to the catalog, and this pull request adopts it.

## What the checks already decided

- The inventories only grew: one catalog export, listed under `adds` in the proposal. `check:inventories` passes it only because that proposal is new here and `adopted`. No layout, content layout, page type, flow state or rule input changed.
- The page keeps one primary action, Book room, with Hold room as its one secondary (`check:priority`, `lint:slots`), and one question outside a disclosure, How long? (`check:one-thing`). Neither section holds a control.
- Room details is still the page's one disclosure, one level deep (`check:disclosure`).
- No task got longer: neither section is a step (`check:step-budget`).
- On the booking preview, `accessible-names.ts` declares both headings and what each list reads, and `check:accessible-names` compares them in Chrome. Neither section adds a control, so no press changed.

## What the checks cannot decide

- Whether the page is now too long. No check counts sections, headings or the distance from the title to Book room. At 1280 by 900 Book room is still above the fold for Harbor; for a busy room like Lantern, five later bookings and five badges push it further down.
- The headings' weight. Todae's `h2` draws Later today and Amenities almost as large as the room's name, and the sections sit as close to How long? as the status does, so at a glance the page reads as five blocks of equal rank. No check reads type scale or spacing.
- Whether Amenities belongs in the open. It could live inside Room details with the equipment, which would keep the page short, but step-free access can rule a room out before booking, so it stays visible here.
- What the waitlist count means on a free room. Nook only lets a person join the waitlist of a room booked now, so the count stands for demand on the room's later times, which no Nook page lets a person join. A real service would say who the count is and let them join. On Cedar, chosen after it freed up, the count does not say whether it includes the person.
- The section order: Later today sits under How long?, since it bears on the length, and Amenities after it. Room details and the two actions now sit under the Amenities heading in the page's heading outline; moving Room details above both sections would change that, at the cost of splitting the length question from the times it bears on.
- The empty states. Quarry has no later bookings and no amenities, and Lantern's later bookings have no one waiting, but every booking preview opens Harbor, so `check:target-size`, `check:accessible-names` and the screenshots never see them. `App.test.tsx` covers them. A preview of another room would need an entry under `flows` previews in `harness.config.ts`, a config change that takes two pull requests.
- Live times. The times are fixed text, read with the load, and nothing drops a booking once it has passed.
- The copy, especially "2 people are waiting in case these times free up." and "Free for the rest of the day."

## Screenshots

The [screenshot gallery](screenshots/room-detail-sections/README.md) shows the four booking previews and the Rooms page at 1280 by 900, before and after. The Rooms page does not change.
