---
status: adopted
changes: []
adds:
  - facts
  - line-items
  - progress
  - text-question
  - room-details
  - select-question
---
# Build every page's body from content layouts

Decided by Ben on Nov 13, 2026. Asked whether every addition should take a proposal, he answered "New patterns", then "Same PR is fine" to whether a new pattern's proposal may be adopted in the pull request that builds it, and "Close the gap" to closing the one way a new pattern skipped a proposal.

Rule or input: the body rule inside `check:inventories`, `lib/page-body.ts` (until now `lib/collection-body.ts`), and a new optional field in each product's config, `shells.chrome`.

Every new component, layout, content layout, page type, flow state and task already takes a proposal, adopted in the pull request that adds it. A block written inside a feature did not. A collection's body had to be a registered content layout, but a detail page's or a content page's body could hold anything the catalog exports, arranged in the feature: Meridian's invoice facts, progress, line items and reason field, and Nook's duration field and room details, were each a pattern that no inventory recorded.

After this change every page's body follows the rule a collection's followed:

- **Body and chrome.** A page type's chrome slots hold no body; every other slot does. A collection names its chrome in its `shells.collections` entry, as today. A primary-slot page's chrome is its primary slot plus its `shells.chrome` entry, and a content page's is its `shells.chrome` entry. A page type with no `shells.chrome` entry has no chrome but its primary slot, so leaving a slot out reads it as body. Chrome names only the slots the body rule cannot read, the breadcrumbs and the text slots, because narrowing chrome later is a changed entry. Meridian names `detail: ["Breadcrumbs", "Heading"]`, so its Meta, Body and Secondary slots are body. Nook names `booking: ["Title", "Facts"]`, so its Back, Body and Alternate slots are body.
- **What a body holds.** Registered content layouts, which take data and callbacks as props and no JSX, and the adapter's status parts, which loading, empty, error and outcome messages are made of. Anything else fails, as it did on a collection: a catalog component placed directly in a body, a component written in the feature that renders one, JSX a status part builds in an expression such as a map or a local const, a value placed straight under the shell outside its slots, and a class the product stylesheet styles that no layout, content layout or page type uses. A shell imported under another name or through a namespace is still read as that shell. So a block of catalog parts on any page is a new content layout, and a new content layout takes a proposal under `adds`. The status parts themselves, Stack, Text and Button among them, still compose freely in a body; whether that leaves room for an unrecorded pattern is a judgment the review notes keep.
- **`shells.chrome` is an inventory.** Naming a slot as chrome takes it out of the rule, so `check:inventories` compares each page type's chrome entry with the base, as it compares the other `shells` entries: a changed entry takes a proposal decided on the base, and a new page type may bring its own chrome entry with it under `page-type:<id>`. A base config with no `shells.chrome` field had no body rule on these pages, so this pull request records each product's chrome once without a proposal, as the lists a base does not export are recorded. `shells.chrome` naming a collection, a page type not in `allowed_page_types` or a slot the shell does not define fails, and so does chrome that leaves a page no body slot.
- **Disclosed sections.** `check:priority` read a disclosed section's summary only in feature files. A body built from content layouts puts the summary in a content layout, so it now also reads every scope a page renders. Line items and Room details are still checked behind their disclosures.

This change checks more than before and loosens nothing, so it is one pull request with this proposal adopted in it. The six content layouts are additions, listed under `adds`; each is a block the products already show, moved out of the feature unchanged.

## Reason

A design system grows by patterns, and the harness's point is that an agent designs from the patterns the inventories record. A block written in a feature is a pattern no one approved and no other page can reuse. The vendor page now being built would have added a facts list and two record tables the same way. With this rule it reuses `facts` and proposes what it lacks, in the same pull request, where the code owner reads the proposal beside the page that wants it.

The cost is a proposal and a content layout for each new block, and content layouts take data as props, so a block's wording moves into props or into the layout. A section listed in `disclosed_sections` keeps its summary text in its layout, because `check:priority` reads that text.

## States

- **Invoice detail:** the facts, progress and closed line items show as before, scenario `invoice-detail`.
- **Requesting changes:** the text question asks "What should change?" under the line items, scenario `invoice-requesting-changes`.
- **Invoice approved:** the progress marks payment as next, scenario `invoice-approved`.
- **Changes requested:** the facts show the new status, scenario `changes-requested`.
- **Choosing a room:** the select question and the closed room details show, scenario `booking-harbor`.
- **Room booked:** the select question is disabled, scenario `booked`.
- **Empty:** Out of scope, every sample invoice has line items and every room lists what it has; the layouts render the lists the page passes.
- **Loading:** Out of scope, a detail or booking page renders only once its record has loaded; loading belongs to the collections.
- **Error:** Out of scope, the text question's error line is the markup the page had, and no scenario submits an empty reason.
- **Long content:** Out of scope, each block keeps the markup it had, and no scenario has longer content than before.
- **Permissions:** Out of scope, everyone who opens a page sees its body.
- **Over time:** a room whose hold ran out shows Hold ended above its select question and room details, scenario `expired`.

## Preview

`check:inventories` on Meridian before the blocks moved, with `shells.chrome` in place:

```
inventory: Facts in products/meridian/features/invoice-approval/views.tsx is not a registered content layout.
```

After the change it passes and prints `inventory: page bodies use registered content layouts.`. The screenshots look the same as before: each block renders the markup it rendered in the feature.

## Adoption

- `packages/harness/src/lib/page-body.ts`, renamed from `collection-body.ts`, reads every page type's body, not only a collection's; `lib/shells.ts` gains `bodyShellsOf`; `lib/parse-config.ts` reads `shells.chrome`; `lib/membership.ts` compares it; `check-priority.ts` reads summaries on every scope a page renders.
- Meridian: `facts`, `line-items`, `progress` and `text-question` under `content-layouts/` and in `allowed_content_layouts`, `shells.chrome` in its config, and its detail view built from them.
- Nook: `room-details` and `select-question` under `content-layouts/` and in `allowed_content_layouts`, `shells.chrome` in its config, and its booking view built from them.
- The fixture product, which `new:product` copies: `line-items` and `text-question`, and `shells.chrome`. New fixture cases for a detail body with a block written in the feature, for a renamed shell, for a block a map builds inside a status part, for a value placed straight under the shell, for `shells.chrome` naming a collection, and for `shells.chrome` that leaves the detail shell no body slot; Vitest cases in `lib/membership.test.ts` for recording `shells.chrome` once, for a changed entry, and for a new page type that brings its chrome entry.
- Docs: `CLAUDE.md`, `AGENTS.md`, the verify skill, `proposals/README.md`, `how-it-works.md` and the check reference, regenerated with `npm run docs:gen`.
