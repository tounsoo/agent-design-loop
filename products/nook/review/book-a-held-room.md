# Review: book a held room

The hold-room task is "Pick a free room and hold it while you decide". Until this change, a held room locked the page, so the decision the hold was for could not be made here. Book room now stays enabled on a held room and books it for the length chosen before the hold. Hold room stays disabled, and the held alert says to book the room to keep it.

## What the checks already decided

- No inventory changed: the flow states, both tasks and their `max_steps`, the priority list, the catalog and the page types are as they were. `check:inventories` compares them with the base.
- Book room is still the one primary button on the booking page, and Hold room is still secondary. `check:priority` and `lint:slots` read that.
- Both tasks still fit their budgets. `check:step-budget` measures each task's shortest path through the shipped reducer, and booking a held room is a longer way to `booked` that leaves both shortest paths as they were.
- Every control in the held preview, Book room now enabled, meets the 24 CSS px floor. `check:target-size` measures it.

## What the checks cannot decide

- Whether booking a held room should keep the length chosen before the hold or ask again. The length field stays locked on a held room, so the booking takes the length chosen before the hold. A designer may want the length editable before booking.
- Whether hold then book should count against book-room's budget. That route is three steps, choose, hold and book, inside the budget of 3, but `check:step-budget` measures only each task's shortest path, so it does not see it.
- Whether a hold should expire on screen after 15 minutes. Nook has no clock, so the held state never ends by itself.
- Whether the alert's "Book it to keep it." is the right copy for the hold.
