---
status: decided
changes: []
---
# Scenarios replace previews

Decided by Ben on Nov 12, 2026, as item 4 of the plan from the harness eval ("Do all in ideal order"). It removes a rule the harness enforces today, that a new or removed preview goes through a proposal, so by [proposal 2026-11-12-right-size-governance](2026-11-12-right-size-governance.md) it lands in two pull requests. This one records the decision and changes nothing any check enforces. The next pull request makes the change and marks this proposal `adopted`.

Rule or input: how the Chrome checks and the screenshots choose what to open, and in which views; what `check:inventories` gates; what `check:state-coverage` checks; one more `## States` rule in `check:proposals`. No product input, rule cap, catalog export, layout, content layout, page type, flow state or adapter field changes. `check:rules` does not change.

- **Scenarios, beside the states.** Each flow gets a product-owned `scenarios.ts` in the folder of its `states` module. It exports `scenarios`: a record from a scenario id to `{ state, ...data }`. The id is a lowercase slug with single hyphens, such as `booking-lantern`, so `--` stays free to join a scenario and a view in a file name. `state` is a modeled state, and the rest is the product's own data for that case: which room, invoice, ledger or vendors, how long a list, which page or route, a failure. The harness exports the `Scenario` and `Scenarios` types and `readScenario(search, scenarios)`, which reads `?scenario=<id>` from an address, from a browser-safe entry point with no Node module in it, so products stop parsing query strings in their own `readPreview` and `readState`. A product turns the scenario into its first render itself: Nook into its first flow state, Meridian into its flow state, page and route. Meridian's live `route` and `invoice` parameters stay, and a scenario sets its own. The checks import `scenarios.ts` in Node, so it holds data only: no JSX, CSS or `window`.
- **What the harness checks about them.** Every modeled state has at least one scenario, every scenario names a modeled state, and an id is used once across a product's flows. `check:state-coverage`, which needs no Chrome, fails any of the three, and the checks that open the app fail them again before Chrome starts, so a product that opts out of a Chrome check still has them checked. A modeled state added later fails until it has a scenario, where today it was opened bare without anyone writing one. Nothing checks that a scenario renders the state it names: a product that ignores the address shows its live state, as a preview that misread its query does today.
- **`flows[].previews` leaves the config.** Meridian's 11 previews become 11 scenarios with the same pages, and Nook's 11 become 13: its booking page also opens on Lantern and Quarry, where today it only ever shows Harbor. `check:inventories` reads the base and the head with the same parser, so it sees the 22 removed preview pairs as no change. This proposal is the record of their removal. Scenarios are product code, not an inventory, so adding or removing one needs no proposal, and `adds` no longer takes `preview:<state>?<query>`. The floor stays gated: a flow state is still an inventory, and each one needs a scenario. Each product's `preview/` folder stays where `paths.app` lists it, so no config path changes.
- **The views.** Every Chrome check and the screenshots open each scenario at `?scenario=<id>`. `check:target-size` measures at 1280 by 900 and at 390 by 844, in light. `check:rendered-page` reads hierarchy, reach, disclosures and phone width in the light scheme at both widths, and contrast in light and dark at both, where today it reads dark only at desktop width. `check:accessible-names` keeps its declarations and the press pass at 1280 by 900 in light, since what a screen reader hears is declared once and focus and announcements do not change with width, and keys each declaration and `knownGaps` entry by scenario id instead of query string. At 390 by 844 in light it also fails a control with no accessible name, so a control only a phone shows, such as Meridian's menu button in place of its sidebar, is named too.
- **Screenshots.** `npm run screenshots` takes every scenario in four views, `desktop-light`, `desktop-dark`, `phone-light` and `phone-dark`, each a full-page PNG named `<scenario>--<view>.png`. `--state` keeps the scenarios of a state, as today, `--scenario <id>` keeps one, and `--view <view>` keeps one view; each repeats, and every filter applies to the before shots too. `--base` at a commit from before scenarios takes no before shots and says so, since its files would pair with none, so the first gallery after this change has no before side. A full gallery with a before side is eight PNGs per scenario, so `AGENTS.md` asks a change that touches some states to pass `--state` for them.
- **`## States` names a scenario.** In a proposal that must have a `## States` section and that the change adds, each edge case that is not `Out of scope, <why>` names the scenario that renders it, as ``scenario `<id>` `` in its text. While a proposal is `adopted`, every scenario it names must exist in some product's `scenarios.ts`, read through the products registry, so a scenario a proposal stands on cannot be removed quietly. A proposal decided before anything is built names the scenarios it will add. Proposals already decided or adopted keep their text.

## Reason

The eval found each state rendered exactly one way, and the gated config owning that way. Nook's booking page has only ever been checked with Harbor, which has two pieces of equipment where Lantern has three and a longer name. Phone width and the dark scheme reach the screenshots never, and `check:rendered-page` only partly. Showing one more room took a proposal. The data a page shows is product code that changes with every feature, so the list of cases belongs beside it, written by whoever builds the page, while the flow states, which are what the product promises to handle, stay an inventory.

Why convention, not a config path: a new path in the config is a config change, and the accessibility declarations already sit beside the views module by convention. Why an id and not the query string: a key that names a case reads in a failure message, in a screenshot's file name and in a known gap, where `state=ready&page=detail&branch=request` does not. Why the declarations stay at one view: they list what a screen reader hears, and a phone layout that moves a menu into a drawer would need a second list for the same state. The phone pass catches what matters there, an unnamed control. Why four screenshots per scenario: a reviewer and the critique see the page a phone and a dark scheme paint, which the checks only measure.

The cost: a removed scenario no longer needs a proposal, so a case can quietly stop rendering. A modeled state can never lose its last one, a scenario an adopted proposal names cannot go, and the screenshots before and after show a scenario that went. Chrome time grows: the rendered-page check opens each scenario four times instead of three, target size and the name pass twice instead of once, and a full gallery is four images per scenario after and four before. The shared build of plan item 8 already pays for the rebuilds. The eval said to start small, with the phone, the dark scheme and Nook's Lantern and Quarry; this takes all of them at once because the views are the harness's, not the product's, and a view that one product gets and another does not is a rule set per product.

## Preview

`check:target-size --list` on Nook after the change:

```
target size: scenario booking-harbor (choosing)
target size: scenario booking-lantern (choosing)
target size: scenario booking-quarry (choosing)
...
target size: 13 scenarios cover 10 modeled states.
```

A flow state with no scenario, from `check:state-coverage`:

```
state coverage: products/nook/flows/booking/scenarios.ts has no scenario for the modeled state "freed". Add one, such as "freed": { state: "freed" }.
```

## Adoption

One pull request.

- `packages/harness/src/lib/scenarios.ts` loads and checks each flow's scenarios and lists what to open, replacing `lib/previews.ts`. `lib/views.ts` names the four views. A browser-safe module exports `Scenario`, `Scenarios` and `readScenario` from its own entry point, `@agent-design-loop/harness/scenarios`.
- `check:state-coverage`, `check:target-size`, `check:accessible-names`, `check:rendered-page`, `screenshots` and `critique` read scenarios and the views above. `lib/accessible-names.ts` and `lib/presses.ts` key declarations and known gaps by scenario id, and a known gap's `previews` becomes `scenarios`. The critique brief names each shot's view and size.
- `parse-config.ts`, `membership.ts` and `check-inventories.ts` drop `previews`. `lib/proposals.ts` and `check:proposals` add the scenario rule for `## States`.
- Meridian and Nook: `scenarios.ts` beside each `states.ts`, `readScenario` in place of their own query parsing, `accessible-names.ts` keyed by scenario id with entries for the new scenarios, the preview menu and the tests on scenario addresses, and `previews` out of each `harness.config.ts`. The fixture product and the fixture cases follow, so `npm run new:product` starts from scenarios, with an illegal case for each new message.
- Docs: `AGENTS.md`, `proposals/README.md`, the harness docs and the verify skill, generated parts by `npm run docs:gen`. Ben's standing yes of Nov 11 covers `CLAUDE.md` and the verify skill in a pull request that changes a check.
- Status: this proposal moves to `adopted`.

Proof: Nook's booking page renders Lantern and Quarry at both widths and in both schemes, and on main they pass. A Quarry scenario added on its own passes the whole `check`, `check:inventories` included, with no proposal.
