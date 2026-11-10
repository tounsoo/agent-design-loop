# Review: content layouts

Content layouts are the compositions that fill a page type's body. `allowed_layouts` stays the app frame. On this change the only content layout is the data table already used by To approve, All invoices, and Vendors.

## What the checks already decided

- `src/content-layouts` matches `allowed_content_layouts`. The id is `data-table`.
- `allowed_layouts` is still `app-shell`. A content layout is not added by extending that list.
- The base of this change does not export `allowed_content_layouts`, so recording the current composition is the bootstrap. Sets the base already had are unchanged. `max_steps` stays 3. Proposal 0001 stays open.
- After this lands, adding or removing a content layout id fails unless the pull request adds a proposal file with a reason, a preview, and a graduation.
- In the ready state, a collection body has to be one of those content layouts. Loading, empty, and error still render in the collection shell and are not content layouts.
- Markup in a feature that is not that layout fails. So does page CSS for a class the feature uses when no registered content layout, chrome layout, or page type uses it. A status board inside the collection body is that failure.
- `check:one-thing` still requires one shell per page type and no primary button on a collection page. It reads `allowed_page_types` for which shells exist. Graduating a page type is a membership change in that inventory, not an edit to the check.
- Editing `src/content-layouts/data-table` without changing its id does not require a proposal.

## What the checks cannot decide

- Whether a new composition is a new content layout, or an implementation edit of the existing data-table layout. Rebuilding the table inside `data-table` keeps the id. The check cannot tell a redesigned table from a different composition that reused the directory.
- Whether a future board should be a content layout of `collection`, or a new page type. Both are membership changes and need a proposal. The check cannot choose which inventory grows. Shipping the board inside the collection body, without either change, now fails.
