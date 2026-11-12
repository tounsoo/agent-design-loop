# Review: scenarios in place of previews

Nook's booking flow now lists its cases in [`flows/booking/scenarios.ts`](../flows/booking/scenarios.ts), under [proposal 2026-11-12-scenarios](../../../proposals/2026-11-12-scenarios.md). Its 11 previews became 13 scenarios: the booking page now also opens on Lantern and Quarry, where it only ever showed Harbor. Every Chrome check and the screenshots open each scenario at 1280 by 900 and at 390 by 844, and the contrast pass and the screenshots read both in light and dark.

## What the checks already decided

- `check:state-coverage`: 13 scenarios cover every modeled state, each id once.
- `check:target-size`: controls on 13 scenarios at both widths, in light, meet 24 CSS px.
- `check:accessible-names`: 13 scenarios announce the 68 things the flow declares, and every control has a name at both widths. Lantern and Quarry declare their own titles and facts.
- `check:rendered-page`: Book room is in the first view at both widths on every booking scenario, and 168 runs of text meet AA in light and dark at both widths.

## What the checks leave open

The critique of the [screenshot gallery](screenshots/scenarios/README.md) passed with six notes. None comes from this change, which renders nothing new; they are what Nook already looks like, seen for the first time at phone width, in dark and on three rooms. Each is a design call for its own change:

- Room names in a list sit close in weight to the page title, on Book a room and on Waitlist.
- The waitlist banners sit tight above the first row and repeat the room the row names.
- On the booking page the All rooms link is indented from the title, and the column width and the action row's alignment shift between held, expired and the plain page.
- The booking page's banner sits tight above How long?, and the Rooms tab turns grey in the booked, error and loading states while its underline stays.
- After booking, the disabled form and both buttons take as much room as the confirmation.
- No rooms centres its text under a left-aligned title and repeats the subtitle's wording.

Whether a long room name, a room with no equipment or a full list of rooms needs a scenario of its own is open too: the sample data has none of them today, and a scenario adds one with no proposal.
