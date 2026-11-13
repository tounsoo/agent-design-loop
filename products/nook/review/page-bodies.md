# Page bodies from content layouts

Nov 13, 2026, [proposal 2026-11-13-page-bodies-from-content-layouts](../../../proposals/2026-11-13-page-bodies-from-content-layouts.md).

## What the checks already decided

- The booking page's Back, Body and Alternate slots are body, and Title and Facts are its chrome (`shells.chrome`). The duration field and the room details are the content layouts `select-question` and `room-details`, and the screenshots before and after match byte for byte.

## What the checks cannot decide

- Whether a block built only from status parts (Stack, Text, Button) is a new pattern. The body rule lets those compose freely.
- The critique's notes, both already on main: the status banner's title reads at the weight of its message and sits close to How long?, and the column width and button alignment differ between choosing, booked and expired. Left for a design change of its own.
