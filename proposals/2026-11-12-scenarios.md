---
status: decided
changes: []
---
# Scenarios replace previews

Decided by Ben on Nov 12, 2026, as item 4 of the plan from the harness eval ("Do all in ideal order"). It removes a rule the harness enforces today, that a new or removed preview goes through a proposal, so by [proposal 2026-11-12-right-size-governance](2026-11-12-right-size-governance.md) it lands in two pull requests. This one records the decision and changes nothing any check enforces. The next pull request makes the change and marks this proposal `adopted`. It changes the harness's own rules and each product's preview code, and after it `check:inventories` no longer reads `flows[].previews`, so it lists no changes.

Rule or input: how the Chrome checks and the screenshots choose what to open, and in which views; what `check:inventories` gates; one more `## States` rule in `check:proposals`. No product input, rule cap, catalog export, layout, content layout, page type, flow state or adapter field changes. `check:rules` does not change.

- **Scenarios, beside the states.** Each flow gets a product-owned `scenarios.ts` in the folder of its `states` module. It exports `scenarios`: a record from a scenario id, a lowercase slug such as `booking-lantern`, to `{ state, ...data }`. `state` is a modeled state, and the rest is the product's own data for that case: which room or invoice, how long a list, which page, a failure. The harness exports the `Scenarios` type and `readScenario(search, scenarios)`, which reads `?scenario=<id>` from an address, so products stop parsing query strings in their own `readPreview`. A product turns the scenario into its first flow state itself.
- **What the harness checks about them.** Every modeled state has at least one scenario, every scenario names a modeled state, and an id is used once across a product's flows. The checks that open the app fail any of the three before Chrome starts, as they fail a stale preview today. A modeled state added later fails until it has a scenario, where today it was opened bare without anyone writing one.
- **`flows[].previews` leaves the config.** Meridian's 11 previews become 11 scenarios with the same pages, and Nook's 11 become 13: its booking page also opens on Lantern and Quarry, where today it only ever shows Harbor. Scenarios are product code, not an inventory, so adding or removing one needs no proposal. `check:inventories` stops comparing previews, and `adds` no longer takes `preview:<state>?<query>`. The floor stays gated: a flow state is still an inventory, and each one needs a scenario.
- **The views.** Every Chrome check and the screenshots open each scenario at `?scenario=<id>`. `check:target-size` measures at 1280 by 900 and at 390 by 844. `check:rendered-page` reads hierarchy, reach, disclosures and phone width in the light scheme at both widths, and contrast in light and dark at both, where today it reads dark only at desktop width. `check:accessible-names` stays at one size and theme, 1280 by 900 in light, since what a screen reader hears does not change with them, and its declarations and `knownGaps` key each entry by scenario id instead of query string.
- **Screenshots.** `npm run screenshots` takes every scenario in four views, `desktop-light`, `desktop-dark`, `phone-light` and `phone-dark`, each a full-page PNG named `<scenario>--<view>.png`. `--state` keeps the scenarios of a state, as today, `--scenario <id>` keeps one, and `--view <view>` keeps one view; each repeats. With `--base` at a commit from before scenarios, the base's own script takes the before shots, so the first gallery after this change still has a before side.
- **`## States` names a scenario.** In a proposal that must have a `## States` section, each edge case that is not `Out of scope, <why>` names the scenario that renders it, as ``scenario `<id>` `` in its text. When the proposal is adopted in the pull request, every scenario it names must exist in a product's `scenarios.ts`. A proposal decided before anything is built names the scenarios it will add. Proposals already decided or adopted keep their text.

## Reason

The eval found each state rendered exactly one way, and the gated config owning that way. Nook's booking page has only ever been checked with Harbor, the room with the shortest name and two pieces of equipment. Phone width and the dark scheme reach the screenshots never, and `check:rendered-page` only partly. Showing one more room took a proposal. The data a page shows is product code that changes with every feature, so the list of cases belongs beside it, written by whoever builds the page, while the flow states, which are what the product promises to handle, stay an inventory.

Why convention, not a config path: a new path in the config is a config change, and the accessibility declarations already sit beside the views module by convention. Why an id and not the query string: a key that names a case reads in a failure message, in a screenshot's file name and in a known gap, where `state=ready&page=detail&branch=request` does not. Why the press pass stays at one view: it presses every action on every scenario on a fresh load, and its findings are about focus and announcements, which neither width nor scheme changes. Why four screenshots per scenario: a reviewer and the critique see the page a phone and a dark scheme paint, which the checks only measure.

The cost: a removed scenario no longer needs a proposal, so a case can quietly stop rendering. A modeled state can never lose its last one, and the screenshots before and after show a scenario that went. Chrome time grows: the rendered-page check opens each scenario four times instead of three, target size twice instead of once, and a full gallery is four images per scenario. The shared build of plan item 8 already pays for the rebuilds.

## Preview

`check:target-size --list` on Nook after the change:

```
target size: scenario booking-harbor (choosing)
target size: scenario booking-lantern (choosing)
target size: scenario booking-quarry (choosing)
...
target size: 13 scenarios cover 10 modeled states.
```

A flow state with no scenario:

```
target size: products/nook/flows/booking/scenarios.ts has no scenario for the modeled state "freed". Add one, such as freed: { state: "freed" }.
```

## Adoption

One pull request.

- `packages/harness/src/lib/scenarios.ts` loads and checks each flow's scenarios and lists what to open, replacing `lib/previews.ts`. A browser-safe module exports `Scenarios` and `readScenario`, re-exported from the harness's `index.ts`.
- `check:target-size`, `check:accessible-names`, `check:rendered-page`, `screenshots` and `critique` read scenarios and the views above. `lib/presses.ts` renames a known gap's `previews` to `scenarios`.
- `parse-config.ts`, `membership.ts` and `check-inventories.ts` drop `previews`. `lib/proposals.ts` and `check:proposals` add the scenario rule for `## States`.
- Meridian and Nook: `scenarios.ts` beside each `states.ts`, `readScenario` in place of their own query parsing, `accessible-names.ts` keyed by scenario id, and `previews` out of each `harness.config.ts`. Meridian's preview menu links to scenarios. The fixture product and the fixture cases follow, so `npm run new:product` starts from scenarios.
- Docs: `AGENTS.md`, `proposals/README.md`, the harness docs and the verify skill, generated parts by `npm run docs:gen`. Ben's standing yes of Nov 11 covers `CLAUDE.md` and the verify skill in a pull request that changes a check.
- Status: this proposal moves to `adopted`.

Proof: Nook's booking page renders Lantern and Quarry at both widths and in both schemes, and on main they pass. A Quarry scenario added on its own passes `check:inventories` with no proposal.
