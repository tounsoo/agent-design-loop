---
status: adopted
changes: []
adds:
  - expired
---
# Nook shows a hold that has ended

Nook's flow states gain one member, `expired`, in `modeledStates` in `products/nook/flows/booking/states.ts`. It is the screen a person sees when the 15 minutes of a hold run out before they book. It only adds a member to a flow state list, so it is adopted in the pull request that adds it, under [proposal 0012](0012-additions-in-one-pull-request.md), and a designer's review of that pull request is its approval.

Rule or input: the flow states for Nook's booking flow. No task, `max_steps`, priority, disclosure, cap, catalog export, layout, content layout, page type, config field or adapter field changes.

## Reason

The held alert promises "Harbor is held for you for 15 minutes", but Nook had no clock, so a hold never ended on screen and the person was never told it had. The review note for booking a held room left that open: "Whether a hold should expire on screen after 15 minutes." The answer needs a state Nook did not model. Reusing `held` would keep promising a hold that no longer exists, and going back to `choosing` silently would drop the person's place with no word about why. A state of its own lets the screen say what happened and offer what is still possible.

The ending comes from the clock, not from the person, so it is a system event like `loaded` and `failed`, not a step. Neither task's route gets longer, and `check:step-budget` measures the same routes as before.

## States

- **Held:** unchanged. "Room held" says the room is held for 15 minutes, Book room is the primary action, and Hold room and the length field are locked.
- **Hold ended:** new. A warning alert, "Hold ended", replaces the held alert in the same status region, so a screen reader announces it. Book room books the room for the length chosen before the hold, All rooms is enabled, and Hold room and the length field stay locked.
- **Booked after the hold ended:** the booked page, such as "Harbor is yours for 30 minutes.", the same as booking from a live hold.
- **Empty:** Out of scope, a hold ends only on a room the person already chose, so there is always a room on the page.
- **Loading:** Out of scope, the hold ends on the device's clock, with no request to wait for.
- **Error:** Out of scope, booking is local to Nook's flow and cannot fail after a hold ends.
- **Long content:** Out of scope, room names come from Nook's fixed list of three short names.
- **Permissions:** Out of scope, Nook has no accounts, so anyone on the page may book.
- **Over time:** a hold made by the person ends after 15 minutes and the page moves from Held to Hold ended. A held preview opened from the URL never ends. Hold ended does not change with more time.

## Preview

The booking page in `expired`, at `?state=expired`:

- A warning alert, "Hold ended", that says the room is no longer held and to book it or pick another room.
- Book room stays the one primary action and books the room for the length chosen before the hold.
- All rooms is enabled again, so the person can pick another room.
- Hold room stays disabled on this screen, so the ended hold is not renewed in one click. Going back through All rooms and choosing the room again starts a new hold, at the default length, as it would for any room.
- The length field stays locked, as it is on a held room.
- The page shows one status at a time: "Hold ended" replaces "Room held" rather than sitting beside it.

The first line `check:inventories` prints on the pull request that adds it:

```
inventory: flow states changed from ["booked","choosing","error","held","loading","no-rooms"] to ["booked","choosing","error","expired","held","loading","no-rooms"]. Adopts proposals/2026-11-11-nook-hold-ends.md (only adds, so it is adopted in the pull request that adds it, which a designer reviews).
```

The gallery at `products/nook/review/screenshots/hold-ends/` shows the held preview before and after this change, and the expired preview after it.

## Adoption

`products/nook/flows/booking/states.ts` adds `expired` to `modeledStates`, an `expired` flow state, a `hold-ended` system event and the hold's length, `HOLD_MINUTES`. `transition.ts` moves a hold to `expired` on `hold-ended`, and books or goes back from `expired`. `shipped.ts` lists `hold-ended` as a system event. `Booking.tsx` sends `hold-ended` once a hold has lasted `HOLD_MINUTES`, except on a held preview opened from the URL, which stays as it is. `views.tsx` renders `expired`, and `readPreview.ts` opens it. `accessible-names.ts` declares what a screen reader hears on it. `App.test.tsx` covers the hold ending and booking after it. A review note, `products/nook/review/hold-ends.md`, records what the checks leave open.
