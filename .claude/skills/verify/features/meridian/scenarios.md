# Scenarios

A developer aid and what every Chrome check opens: `?scenario=<id>` opens one of the cases in `products/meridian/flows/invoice-approval/scenarios.ts`, a modeled state with the page, route, branch or vendor it shows, without clicking through, and the header's Preview menu links to each. The shell stays up in every state, and loading, empty and error render inside `main`. An id the file doesn't have is ignored, and the rest of the URL decides the page: the live `route`, `invoice` and `vendor` parameters still work.

## Sub-features

- `scenario-states` opens loading, empty, error, queue, invoice-approved, changes-requested and vendor-added.
- `scenario-pages` opens `invoices`, `vendors`, `invoice-detail`, `invoice-requesting-changes` and the five `vendor-*` pages, each a page or branch of `ready`.
- `scenario-unknown` ignores an id the file doesn't have.
- `scenario-coverage` keeps a view and a scenario for every modeled state.

## How to get to it (user POV)

- Open the `Preview` menu in the header and choose a scenario, or `Live` for the app as it runs.
- Open a URL such as `?scenario=loading`, `?scenario=empty` or `?scenario=invoice-requesting-changes`.

## Driving it with Vitest, the rule checks and a browser

Preconditions:

- The baseline preconditions hold.

- **States.** Open `?scenario=loading`, `?scenario=empty` and `?scenario=error`. Run `npx vitest run -t "renders loading, empty, and error"` and `npx vitest run -t "shows the load error with a secondary retry"`. They show `Loading invoices`, the heading `No invoices waiting`, and `Couldn't load invoices.` with a secondary `Try again`.
- **Parameters.** Run `npx vitest run -t "scenario preview"`. Its cases pass: a scenario's state, page and branch, an unknown id ignored, a route and an invoice id, and a scenario's own route over the one asked for.
- **Coverage.** Run `npm run check:state-coverage -- --config products/meridian/harness.config.ts`. It prints `7 modeled states have views` and `16 scenarios cover every modeled state, each id once.`
- **Scenarios.** Run `npm run check:target-size -- --list --config products/meridian/harness.config.ts`. It prints each scenario with its state and `target size: 16 scenarios cover 7 modeled states.` without Chrome.
- **Browser.** Run `CHROME_PATH=<chrome> npm run check:target-size -- --config products/meridian/harness.config.ts`. It opens every scenario at 1280 by 900 and at 390 by 844 and prints `target size: controls on 16 scenarios at 1280 by 900 and 390 by 844, in light, meet 24 CSS px (or the WCAG spacing exception).`

## Gotchas

- `check:target-size`, `check:accessible-names`, `check:rendered-page` and `npm run screenshots` open every scenario in each flow's `scenarios.ts`. A new scenario is opened without editing a script or the config, and needs no proposal. A modeled state with no scenario, a scenario for a state that is not modeled, an id that is not a lowercase slug, and an id used twice fail `check:state-coverage`.
- `scenarios.ts` is imported in Node by the checks, so it holds data only: no JSX, CSS or `window`.
- Every other scenario is covered by the feature file that drives its page: [collections](collections.md), [approve an invoice](approve-invoice.md), [request changes](request-changes.md) and [the vendor page](vendor-page.md). This file covers the states no page owns.

## Covers

- Scenarios: `?scenario=loading`, `?scenario=empty`, `?scenario=error`
