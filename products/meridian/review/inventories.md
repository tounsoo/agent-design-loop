# Review: inventories

The inventories record the catalog, layouts, page types, flow states, and rule inputs this repo already had. `allowed_layouts` and `allowed_content_layouts` were added as lists later. Everything else was already data.

## What the checks already decided

- `products/meridian/layouts` matches `allowed_layouts`. The only id is `app-shell`.
- `products/meridian/page-types` and the `pageTypes` export match `allowed_page_types`: `collection` and `detail`. `check:one-thing` reads that inventory. It does not keep a second list of page-type ids.
- Catalog membership is the export names in `products/meridian/catalog/index.ts`. Flow-state membership is `modeledStates`.
- Rule inputs are each task's `max_steps`, the priority items, `disclosed_sections`, the disclosure caps, the visible-question cap, the target-size floor, and the allowed lists.
- Imports may name only those layout, content-layout and page-type ids.
- Three lists may be introduced when the base does not export them: `allowed_layouts`, `allowed_content_layouts` and `disclosed_sections`. That bootstrap is how `allowed_layouts` was first recorded. The design system adapter may be recorded the same way, once, when the base names none. A product the base does not have records all of its inventories. Every other inventory, and a list or adapter the base already has, cannot change that way.
- A change that only adds members to the catalog exports, `allowed_layouts`, `allowed_content_layouts`, `allowed_page_types` or the flow states graduates in one pull request: the pull request adds a proposal that starts as `status: graduated`, lists the new members under `adds` and nothing under `changes`. That pull request's review, which `CODEOWNERS` requests for `proposals/`, is the only approval.
- Every other membership change, such as a removal, a rename or a rule input, passes `check:inventories` only when the pull request graduates a proposal: `status: decided` on the base, `status: graduated` in the change, with each changed name listed under `changes` as the base has it. A proposal the same pull request adds covers none of these, so they take two pull requests, approval and then graduation.
- `check:proposals` fails a proposal without its front matter, or without text under `## Reason`, `## Preview` and `## Graduation`. It also fails `adds` beside `changes`, `retires` or `opts-out`, or on a proposal that is not graduated, a status that skips a step or moves back, a decided or graduated proposal whose lists change, a new proposal that starts graduated with anything under `changes`, `retires` or `opts-out`, and a decided or graduated proposal that is renamed or deleted.
- Editing `products/meridian/layouts/app-shell` or a page-type shell without changing its id does not require a proposal.

## What the checks cannot decide

- Whether a proposal's reason is good enough to approve, or whether the preview is the right UI. The checks see that each section has text, not what the text says.
- Whether a designer looked at an addition. On the one-pull-request path nothing the check reads shows an approval, so the review blocks the merge only where branch protection requires code owner review.
- Whether the graduating change is the one the designer approved. The check pins the names under `changes`, not their values, so whether a constant became the number the preview showed is the reviewer's to compare.
- Whether an implementation edit that keeps the same ids changed the product enough to need a proposal. Slot behavior, copy, and invoice fields are outside the membership set.
- Whether a stringly-typed screen inside the existing page types should have been a new page type. The check looks at directories, the `pageTypes` export, and import paths.
- Whether a new kind of product input, one the check is not written to read, should join the membership set.
