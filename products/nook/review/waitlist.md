# Review: the Waitlist page

Nook had one place, the free rooms. It now has two, Rooms and Waitlist, switched from the top bar. The Waitlist page lists the rooms booked for the next hour and a half, Cedar and Birch, each with Join waitlist or Leave waitlist. On the page, the first room a person waits for frees up after `FREE_UP_SECONDS`, standing in for someone cancelling, and its row offers Choose, which opens its booking page. The rooms a person waits for stay with them on every page. [Proposal 2026-11-12-nook-waitlist](../../../proposals/2026-11-12-nook-waitlist.md) adds `Nav` to the catalog, the `room-rows` content layout and the flow states `waitlist`, `waiting` and `freed`, and this pull request adopts it.

## What the checks already decided

- The inventories only grew: one catalog export, one content layout and three flow states, each listed under `adds` in the proposal. `check:inventories` passes them only because that proposal is new here and `adopted`.
- The Waitlist page is a `rooms` page, which the config names a collection, so its body has to be a registered content layout or the catalog's status parts (`check:inventories`), and it may hold no primary action (`check:one-thing`). It holds `room-rows` and a status region, and every action on it is secondary.
- Each new state has a view and a preview, `?state=waitlist`, `?state=waiting` and `?state=freed`, so `check:state-coverage`, `check:target-size` and `check:accessible-names` read all three. On every preview, `accessible-names.ts` declares which top bar place is current and whether both are turned off.
- Neither task got longer. Joining, leaving and switching places are steps neither task graph names, and `room-freed` comes from the clock, so `check:step-budget` measures the same routes.

## What the checks cannot decide

- Whether Waitlist belongs in the top bar. It needed a navigation landmark, so Nook's frame changed from one job to two. "No rooms are free" also offers See the waitlist, since that is where a person most needs it; the Rooms page with free rooms offers only the top bar.
- Whether the Waitlist page should be its own page type. It reuses the `rooms` shell (title, intro, list), which fits. A page type of its own would need a `shells.collections` entry, a config change that takes two pull requests, so the harness pushed toward reuse. A page type added without that entry is in neither `shells` list, so the collection rules would not read it; I didn't take that path.
- Whether a freed room should wait for the person anywhere but the Waitlist page. A room frees up only while they are on that page, and leaving it drops the offer. A real service would hold the room for a while and tell them wherever they are.
- Whether a freed room should join the Rooms page. Nook's free rooms are a fixed list, so after choosing Cedar and going back to All rooms, Cedar is not among them.
- Whether the queue position should show ("2nd in line"). Nook has no queue to read it from.
- Whether the top bar should be turned off while a room is held or booked. It follows All rooms, which the flow already turns off there.
- The page width: each page is as wide as its content, so the Waitlist page is wider than the Rooms page at 1280 px.
- The copy, especially "If a room frees up, it shows here." and "Choose it to book it.", and whether the success tone suits a room freeing up.

## Screenshots

The [screenshot gallery](screenshots/waitlist/README.md) shows each preview at 1280 by 900: every existing preview before and after the top bar gained Rooms and Waitlist, and the three Waitlist previews, which are new and have no before shot.
