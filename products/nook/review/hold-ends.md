# Review: a hold that ends

A hold lasts 15 minutes, and the held alert says so, but until this change a hold never ended on screen. Nook now models one more flow state, `expired`, graduated in the same pull request by [proposal 0014](../../../proposals/0014-nook-hold-ends.md). When a hold has lasted `HOLD_MINUTES`, the clock sends `hold-ended`, and the booking page shows a warning alert, "Hold ended". Book room books the room for the length chosen before the hold, All rooms is enabled again, and Hold room and the length field stay locked.

## What the checks already decided

- The flow states gained exactly one member, `expired`, and lost none. `check:inventories` passes it only because a proposal new in this pull request lists `expired` under `adds` and is `graduated`.
- `expired` has a view and a preview, `?state=expired`. `check:state-coverage` reads the view's cases, and `check:target-size` measures the preview's controls, All rooms and Book room now enabled, against the 24 CSS px floor.
- Book room is still the one primary button on the booking page, and Hold room is still secondary. `check:priority` and `lint:slots` read that.
- Neither task's route got longer. `hold-ended` comes from the clock, not from the person, so it is a system event, like `loaded` and `failed`, and `check:step-budget` does not count it as a step.

## What the checks cannot decide

- Whether a room whose hold ended is still free. Nook's sample rooms never get taken, so Book room always succeeds after a hold ends. A real booking service would need to answer, and the page would need a state for a room someone else took.
- Whether Hold room should stay disabled after a hold ends. It stops a person from renewing a hold without end, but it also means a person who needs a few more minutes must book or let the room go.
- Whether the hold should end on screen while the tab is in the background. The timer is the browser's, so a sleeping laptop may show the hold for longer than 15 minutes, and nothing warns before the hold ends.
- Whether "Hold ended" and "Book it now, or pick another room." are the right copy, and whether a warning, not an info alert, is the right tone.

## Screenshots

The booking page at 1280 px, light theme. Before, a held room 15 minutes in still read "Room held". After, the same moment reads "Hold ended". The held preview itself renders pixel for pixel as before.

![Before: the held booking page](screenshots/hold-ends-before.png)

![After: the hold-ended booking page](screenshots/hold-ends-after.png)
