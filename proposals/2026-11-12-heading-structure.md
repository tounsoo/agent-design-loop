---
status: adopted
changes: []
---
# Check heading structure, not heading sizes

Decided by Ben on Nov 12, 2026: "Todae doesn't define section size. It defines current size for each h tag and if you want a new size, you define it on product." "With theme customize feature of todae." "Shouldn't be px specific check but rather if it uses proper tag." This pull request records the decision and changes nothing a check enforces. A later pull request makes the change and marks this proposal `adopted`. It changes the harness's own rule, not an inventory, so it lists no changes.

Rule or input: the hierarchy part of `check:rendered-page`, from [proposal 2026-11-12-rendered-page](2026-11-12-rendered-page.md). Today it fails a heading, a disclosure's summary included, that sits fewer than two steps below the page title on the design system's type scale, or one step inside a list of records, and it fails a design system stylesheet with no numbered type scale. After the change it reads no size at all. It fails instead, on each page, meaning each `[data-page]` element as the check reads it today, so the shared chrome around it, a brand or a nav landmark, is not read:

- **One title.** A page with no visible h1, as today, and a page with a second h1. A visually hidden h1 is not a title, and it is a second h1 when a visible one is there. A heading before the title fails too: the title is the page's first heading.
- **No skipped level.** A heading more than one level below the heading before it in document order, such as an h3 straight after the h1. Going back up, from an h3 to an h2, is fine.

That is the outline a screen reader announces: a flat list of headings in document order, each with its level. How the elements nest in the DOM does not count, since browsers dropped the HTML outline algorithm, so an h2 inside a card inside another h2's wrapper is a sibling of that h2, as a screen reader hears it.

Headings are h1 to h6 and `role="heading"` with its `aria-level`, read as a screen reader finds them: a visually hidden heading counts toward levels, and one that is not rendered, hidden, `aria-hidden` or inside a closed disclosure does not. A disclosure's summary is not a heading, so it is no longer measured. Reach, disclosures, contrast and phone width stay as they are. This replaces the hierarchy part of proposal 2026-11-12-rendered-page, which keeps its text as the record of what was decided then.

Text styled to look like a heading without a heading tag is not checked. Telling it from body text means comparing sizes and weights, which is what this change takes out, and it would fail figures, totals and badges on ordinary pages. A page whose title is styled text still fails, since it has no h1. For the rest, the critique of the screenshots judges whether a block reads as a heading. In Todae the type already settles most of it: `Text.Root` takes no size, so its size follows its tag.

## Reason

The size rule asked every product to shrink Todae's own heading scale. Todae sets a size per heading tag, h1 30 px and h2 24 px, so a page that used h2 for its sections at Todae's defaults failed: [pull request 48](https://github.com/tounsoo/agent-design-loop/pull/48), [pull request 49](https://github.com/tounsoo/agent-design-loop/pull/49), and the vendor page now being built, whose plain h2 sections fail the same way. A product that wants other sizes sets them through Todae's theme customization, so sizes belong to the design system and the product's theme, not to a harness rule. What a check can hold on any design system is structure: the right tag at the right level, which is what a screen reader and a search engine read. How much visual weight each heading carries is the critique's to judge: its hierarchy pattern already asks whether section headings read as clearly below the title.

Two pull requests, because the change loosens the check: a page it fails today on size alone passes after it, a disclosure summary as large as the title passes, and the check no longer needs the adapter's stylesheet to number its sizes. Harness code is not an inventory, so this decided proposal is the record for the whole change, the loosening and the new structure rules together; nothing in it needs a proposal that only adds or tightens.

## Preview

A dry run of the new rule on `main` and on scratch copies of pull requests 48 and 49 merged with `main`, on Nov 12:

- **Main:** Meridian's 11 scenarios and Nook's 13 pass. Every page has one h1, and no level is skipped. One skip waits unrendered: Meridian's invoice table, filtered to nothing, shows `EmptyState.Title as="h3"` right under the collection page's h1. No scenario renders that state, so the check passes; a scenario that does will fail until the title is h2. That is a product fix of its own.
- **48 (Nook, waitlist and amenities):** passes. "Later today" and "Amenities" are h2 under the h1 "Harbor", which the size rule failed.
- **49 (Meridian, crowded detail):** passes on headings. "Vendor" and "Activity" are h2 under the vendor's h1. Its crowding is the critique's to judge.
- **Fixtures:** `section-heading-near-title` and `heading-in-a-one-item-list` fail today on size. Their pages are proper h1 and h2 at Todae's default sizes, so they become one legal case that must pass. It also holds what the new rules let through: an h2 inside a card in another h2's wrapper, a visually hidden h2, an h3 in a list of one item, and going back up from h4 to h2. New illegal cases: a skipped level, two h1s and a heading before the title. `page-without-a-title`, whose title is styled text, keeps failing.

## Adoption

The later pull request changes:

- `packages/harness/src/check-rendered-page.ts` and `packages/harness/src/lib/rendered-page.ts`: the hierarchy part reads heading structure as above, and the type-scale reading goes. `typeScaleTokens` and `scaleFrom` in `packages/harness/src/lib/tokens.ts` go with their tests, since nothing else reads them. `resolveLength` stays for `check:target-size`.
- `packages/harness/src/check-rendered-page.meta.ts`, then `npm run docs:gen` for `CLAUDE.md`, the verify skill's generated list and the check reference. Ben's standing yes of Nov 11 covers `CLAUDE.md` and the verify skill in a pull request that changes a check. The hand-written lines that say two type-scale steps follow: the harness README's check table and its "A pattern, not a count" example, `how-it-works.md`'s fixture table, and the verify skill's paragraph on the check. The review notes under `products/*/review/` and proposal 2026-11-12-rendered-page are records of earlier pull requests and keep their text.
- The fixture cases above, the legal case `product`, whose pass line changes, and `rendered-page-patterns`, whose case comment names the list allowance that goes.
- The critique's hierarchy pattern in `packages/harness/src/lib/critique.ts` says the check reads tags, not sizes, so the critique is where visual weight, and text styled as a heading, is judged.
- This proposal moves to `adopted`.
