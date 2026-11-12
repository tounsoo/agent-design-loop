---
status: adopted
changes: []
adds:
  - page-type:guide
---
# Nook gains a guide page that explains booking

A throwaway proof for proposal 2026-11-12-right-size-governance: a new page type with its own new `shells` entry, adopted in the pull request that adds it. This pull request is closed without merging.

## Reason

Shows that a new page type, named under `shells.content` with every entry the base had unchanged, passes `check:inventories` in one pull request.

## Preview

A page titled "How booking works" with one paragraph and no actions.

## Adoption

`allowed_page_types` and the page-type barrel gain `guide`, `shells.content` names it, and `features/booking/Guide.tsx` renders it.

## States

- Ready: the title and one paragraph.
- Empty: Out of scope, the page's text is fixed.
- Loading: Out of scope, nothing loads.
- Error: Out of scope, nothing loads.
- Long content: Out of scope, the text is fixed and short.
- Permissions: Out of scope, everyone sees the same page.
- Over time: Out of scope, the page does not change.
