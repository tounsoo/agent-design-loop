---
status: adopted
changes: []
---
# Check the page as Chrome paints it

Decided by Ben on Nov 12, 2026, as item 1 of the plan from the harness eval ("Do all in ideal order"), and adopted with its own pull request. It adds one rule check, `check:rendered-page`, to `check:rules`. No product's inputs, catalog, layouts, page types, flows or config change, and no adapter field is added, so it lists no changes and is adopted at once.

Rule or input: a new rule in `check:rules`, run after `check:accessible-names` on the build `check:product` already serves. Its numbers are the harness's own constants in `packages/harness/src/lib/rendered-page.ts`, not product inputs: two type-scale steps for a section heading, one for a heading inside a list item or table row, the WCAG AA ratios, and two views, 1280 by 900 and 390 by 844.

The check opens every preview three times, at desktop width in the light and the dark colour scheme and at phone width in the light one, and fails:

- **Hierarchy.** A heading that sits fewer than two steps below the page's title on the design system's type scale. The scale is the numbered `font-size` tokens in the adapter's `tokens.css`, so with Todae's 30 px title a section heading is 20 px or smaller. A heading inside a list item or a table row repeats per record, a room's or a vendor's name, and sits one step below.
- **Reach.** On a page type with a primary slot, a rank-1 action that is not whole in the first view, or that something covers, at either width.
- **Disclosures.** A `<details>` whose summary shows and that is open on load, unless the flow's `accessible-names.ts` declares it with `expanded: true` on that preview.
- **Contrast.** Any run of text under WCAG AA against what is painted under it, in light and in dark.
- **Phone width.** A document wider than the 390 px view.

## Reason

The complex-page test showed it. Two pull requests, 48 for Nook and 49 for Meridian, built pages that crowded: section headings as large as the record they belonged to, and Meridian's Approve below the fold on every detail page. Every check passed, because every check reads code and none reads the page. The root problem was hierarchy, not how many sections a page has, and Ben ruled out per-page numeric budgets on Nov 12: "how many section isn't a design pattern". So each rule here is a pattern that holds on any page. None counts sections, and none sets a number per page or per page type.

Why the type scale from the tokens, not pixels: a product on another design system keeps the rule without a config edit, because the check reads that system's own scale. Why harness constants and no adapter or config field: a field is an inventory, which would take a proposal decided on the base and a second pull request, and nothing about two steps is product-specific. Why `accessible-names.ts` for a disclosure a state opens: it already declares, per preview, what is expanded, so the check asks for nothing new.

Why fix the products in the same pull request: the check cannot land green otherwise, and main must stay green. Three fixes went in with it. Nook's dark scheme painted its page on white, because its root did not take Todae's canvas. Nook's room cards are now a list, so a room's name counts as a record name, as Meridian's directory rows do. Meridian's detail pages pin their action row, the same hunk pull request 49 makes, so Approve is in view on a phone.

## Preview

The dry run on scratch copies of pull requests 48 and 49, merged with this check:

- **48 (Nook, waitlist and amenities):** fails on hierarchy. "Later today" and "Amenities" are 24 px under the 30 px title "Harbor", one step, on the booking, booked, held and expired previews, at both widths. Reach, disclosures, contrast and phone width pass.
- **49 (Meridian, crowded detail):** fails on hierarchy. "Vendor" and "Activity" are 24 px on the four detail previews. With its pinned action row taken out, it also fails on reach: Approve sits 974 to 1012 px down at desktop width and 1226 to 1264 px down on a phone, in a 900 and an 844 px view.

Main, with the three fixes, passes: Meridian's 11 previews and Nook's 11, every run of text at AA in both schemes.

## Adoption

Adopted in the pull request that adds `check:rendered-page`, its fixture cases under `packages/harness/fixtures/`, and the three product fixes above. What it does not see: a state a press reveals, data no preview renders, text over an image or gradient, and whether the hierarchy is the right one. The critique of the screenshots, plan item 2, judges those.
