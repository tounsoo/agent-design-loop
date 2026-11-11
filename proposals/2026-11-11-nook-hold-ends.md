---
status: graduated
changes: []
adds:
  - expired
---
# Nook shows a hold that has ended

Nook's flow states gain one member, `expired`, in `modeledStates` in `products/nook/flows/booking/states.ts`. It is the screen a person sees when the 15 minutes of a hold run out before they book. It only adds a member to a flow state list, so it graduates in the pull request that adds it, under [proposal 0012](0012-additions-in-one-pull-request.md), and a designer's review of that pull request is its approval.

Rule or input: the flow states for Nook's booking flow. No task, `max_steps`, priority, disclosure, cap, catalog export, layout, content layout, page type, config field or adapter field changes.

## Reason

The held alert promises "Harbor is held for you for 15 minutes", but Nook had no clock, so a hold never ended on screen and the person was never told it had. The review note for booking a held room left that open: "Whether a hold should expire on screen after 15 minutes." The answer needs a state Nook did not model. Reusing `held` would keep promising a hold that no longer exists, and going back to `choosing` silently would drop the person's place with no word about why. A state of its own lets the screen say what happened and offer what is still possible.

The ending comes from the clock, not from the person, so it is a system event like `loaded` and `failed`, not a step. Neither task's route gets longer, and `check:step-budget` measures the same routes as before.

## Preview

The booking page in `expired`, at `?state=expired`:

- A warning alert, "Hold ended", that says the room is no longer held and to book it or pick another room.
- Book room stays the one primary action and books the room for the length chosen before the hold.
- All rooms is enabled again, so the person can pick another room.
- Hold room stays disabled on this screen, so the ended hold is not renewed in one click. Going back through All rooms and choosing the room again starts a new hold, at the default length, as it would for any room.
- The length field stays locked, as it is on a held room.

`check:inventories` on the pull request that adds it:

```
inventory: flow states changed from ["booked","choosing","error","held","loading","no-rooms"] to ["booked","choosing","error","expired","held","loading","no-rooms"]. Graduates proposals/2026-11-11-nook-hold-ends.md (only adds, so it graduates in the pull request that adds it, which a designer reviews).
```

Screenshots of the held and expired previews are in that pull request.

## Graduation

`products/nook/flows/booking/states.ts` adds `expired` to `modeledStates`, an `expired` flow state, a `hold-ended` system event and the hold's length, `HOLD_MINUTES`. `transition.ts` moves a hold to `expired` on `hold-ended`, and books or goes back from `expired`. `shipped.ts` lists `hold-ended` as a system event. `Booking.tsx` sends `hold-ended` once a hold has lasted `HOLD_MINUTES`, except on a held preview opened from the URL, which stays as it is. `views.tsx` renders `expired`, and `readPreview.ts` opens it. `App.test.tsx` covers the hold ending and booking after it. A review note, `products/nook/review/hold-ends.md`, records what the checks leave open.
