# Review: inventories

The inventories record the catalog, layouts, page types, flow states, and rule inputs this repo already had. `allowed_layouts` is the new list. Everything else was already data.

## What the checks already decided

- `products/meridian/layouts` matches `allowed_layouts`. The only id is `app-shell`.
- `products/meridian/page-types` and the `pageTypes` export match `allowed_page_types`: `collection` and `detail`. `check:one-thing` reads that inventory. It does not keep a second list of page-type ids.
- Catalog membership is the export names in `products/meridian/catalog/index.ts`. Flow-state membership is `modeledStates`.
- Rule inputs are each task's `max_steps`, the priority items, `disclosed_sections`, the disclosure caps, the visible-question cap, the target-size floor, and the allowed lists.
- Imports may name only those layout, content-layout and page-type ids.
- This pull request's base does not export `allowed_layouts`, so recording the current sets is the bootstrap. Sets that already existed on main are unchanged. `max_steps` stays 3. Proposal 0001 stays open.
- After this lands, a membership change against that base fails unless it graduates a proposal decided on the base that lists it. Proposal 0010 made that the rule; before it, a new proposal file with a reason, a preview, and a graduation was enough.
- Editing `products/meridian/layouts/app-shell` or a page-type shell without changing its id does not require a proposal.

## What the checks cannot decide

- Whether a proposal's reason is good enough to graduate, or whether the preview is the right UI. `check:proposals` only sees that each section has text.
- Whether the person who moved a proposal to `status: decided` was a designer. The check reads the status on the base; the review on that pull request is the approval, and `main` does not require it.
- Whether an implementation edit that keeps the same ids changed the product enough to need a proposal. Slot behavior, copy, and invoice fields are outside the membership set.
- Whether a stringly-typed screen inside the existing page types should have been a new page type. The check looks at directories, the `pageTypes` export, and import paths.
- Whether a new kind of product input, one the check is not written to read, should join the membership set.
