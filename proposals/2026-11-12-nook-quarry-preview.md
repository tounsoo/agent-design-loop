---
status: adopted
changes: []
adds:
  - preview:choosing?page=booking&room=quarry
---
# Nook previews Quarry's booking page

A throwaway proof for proposal 2026-11-12-right-size-governance: a new preview pair adopted in the pull request that adds it. This pull request is closed without merging.

## Reason

Every preview of the booking page shows Harbor. Quarry seats two and has only a phone, so its page is the shortest; a preview of it lets the checks measure that page too.

## Preview

The booking page for Quarry while choosing: its title, the duration select, Hold room and Book room.

## Adoption

Nook's config lists `page=booking&room=quarry` under `choosing`, the preview reader picks the room from `room`, and `accessible-names.ts` declares what that preview says.

## States

- Choosing: Quarry's booking page, as the Harbor preview shows Harbor's.
- Empty: Out of scope, the preview opens one known room.
- Loading: Out of scope, the existing loading preview covers it.
- Error: Out of scope, the existing error preview covers it.
- Long content: Out of scope, Quarry has the shortest details.
- Permissions: Out of scope, everyone sees the same page.
- Over time: Out of scope, the existing held and expired previews cover it.
