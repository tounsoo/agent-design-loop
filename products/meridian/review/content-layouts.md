# Review: content layouts

Content layouts are the compositions that fill a page type's body. `allowed_layouts` stays the app frame. There are two: the data table, used by To approve and All invoices, and the directory, used by Vendors. [Proposal 2026-11-12-vendor-directory](../../../proposals/2026-11-12-vendor-directory.md) added the directory.

## What the checks already decided

- `products/meridian/content-layouts` matches `allowed_content_layouts`. The ids are `data-table` and `directory`.
- `allowed_layouts` is still `app-shell`. A content layout is not added by extending that list.
- `allowed_content_layouts` was first recorded as a bootstrap, when the base did not export it. Lists the base already had were unchanged.
- Adding a content layout id passes when the pull request only adds to `allowed_content_layouts`, keeping every id the base had, and adds a proposal that starts as `status: adopted` and lists every new id under `adds`.
- Removing one fails unless the pull request adopts a proposal that is `status: decided` on the pull request's base and lists that id under `changes`. A rename removes one id and adds another, so the proposal lists both.
- Every page's body has to be one of those content layouts or the catalog's status pieces, the invoice detail included ([proposal 2026-11-13-page-bodies-from-content-layouts](../../../proposals/2026-11-13-page-bodies-from-content-layouts.md)). A collection's chrome is its `shells.collections` entry, and the detail page's is its primary slot and its `shells.chrome` entry, Breadcrumbs and Heading. The check reads the code, not the state, so it cannot tell which state renders which: on To approve and All invoices, loading, empty, and error render in the collection shell, and on Vendors, empty is the directory's own, with the add form open.
- Markup in a feature that is not that layout fails. So does page CSS for a class the feature uses when no registered content layout, chrome layout, or page type uses it. A status board inside the collection body is that failure.
- `check:one-thing` requires every page type in `allowed_page_types` to render at least one page, no page rendered inside another, and no primary button on a collection page. A page type may render as many pages as the product needs. The check reads `allowed_page_types` for which shells exist. Adopting a page type is a membership change in that inventory, not an edit to the check.
- Editing `products/meridian/content-layouts/data-table` or `directory` without changing its id does not require a proposal.

## What the checks cannot decide

- Whether a new composition is a new content layout, or an implementation edit of the existing data-table layout. Rebuilding the table inside `data-table` keeps the id. The check cannot tell a redesigned table from a different composition that reused the directory.
- Whether a future board should be a content layout of `collection`, or a new page type. Both are membership changes and need a proposal. The check cannot choose which inventory grows. Shipping the board inside the collection body, without either change, now fails.

## Page bodies from content layouts (Nov 13, 2026)

What the checks decided: the detail page's Meta, Body and Secondary slots are body, so the facts, progress, line items and text question are content layouts now, and the screenshots before and after match byte for byte.

What the checks cannot decide:

- Whether a block built only from status parts (Stack, Text, Button) is a new pattern. The body rule lets those compose freely, so such a block passes without a proposal.
- The critique's notes, both already on main before this change: the vendor name shows as the title and again in the facts and the approved banner, and the facts sit tight under the title while Line items reads at body weight. Left for a design change of its own.

