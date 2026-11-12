# Review: Approve in view on a phone

`check:rendered-page` opens every preview as Chrome paints it, under [proposal 2026-11-12-rendered-page](../../../proposals/2026-11-12-rendered-page.md). On main it failed one Meridian preview: with a change request open (`?state=ready&page=detail&branch=request`), Approve sat 830 to 868 CSS px down on a 390 by 844 phone, below the first view. The invoice page's action row is now pinned to the bottom of the view while the page scrolls, the same change pull request 49 makes, so the two merge cleanly.

## What the checks already decided

- `check:rendered-page` passes all 11 previews: Approve whole in the first view at 1280 by 900 and 390 by 844, nothing over its centre, section headings two type-scale steps under the title, every run of text at AA in light and dark, and no sideways scroll on a phone.
- `check:target-size` and `check:accessible-names` pass as before: the row holds the same buttons in the same order.

## What the checks cannot decide

- Whether a pinned row reads as part of the invoice or as chrome. It sits on the canvas colour with a hairline above it, so content scrolls under it rather than beside it.
- Whether the row should pin at desktop width too. It does, because the rule is the same on any page; on a short invoice it simply sits where it always did.

## Screenshots
