# Review: inventories

The inventories record the catalog, layouts, page types, flow states, and rule inputs this repo already had. `allowed_layouts` is the new list. Everything else was already data.

## What the checks already decided

- `src/layouts` matches `allowed_layouts`. The only id is `app-shell`.
- `src/page-types` and the `pageTypes` export match `allowed_page_types`: `collection` and `detail`. `check:one-thing` reads that inventory. It does not keep a second list of page-type ids.
- Catalog membership is the export names in `src/catalog/index.ts`. Flow-state membership is `modeledStates`.
- Rule inputs are each task's `max_steps`, the priority items, `disclosed_sections`, the disclosure caps, the visible-question cap, the target-size floor, and the allowed lists.
- Imports may name only those layout, content-layout and page-type ids.
- This pull request's base does not export `allowed_layouts`, so recording the current sets is the bootstrap. Sets that already existed on main are unchanged. `max_steps` stays 3. Proposal 0001 stays open.
- After this lands, a membership change against that base fails unless the pull request adds a proposal file with a reason, a preview, and a graduation.
- Editing `src/layouts/app-shell` or a page-type shell without changing its id does not require a proposal.

## What the checks cannot decide

- Whether a proposal's reason is good enough to graduate, or whether the preview is the right UI. The check only sees that a new file contains those three words.
- Whether a pull request that both adds a proposal and edits the inventory is graduating early. For a request, merging the proposal is supposed to record it, and a later change applies it. A proposal marked `Status: decided` lands with its change on purpose. The check accepts the file either way. A reviewer has to refuse an edit that should have waited.
- Whether an implementation edit that keeps the same ids changed the product enough to need a proposal. Slot behavior, copy, and invoice fields are outside the membership set.
- Whether a stringly-typed screen inside the existing page types should have been a new page type. The check looks at directories, the `pageTypes` export, and import paths.
- Whether a new kind of product input, one the check is not written to read, should join the membership set.
