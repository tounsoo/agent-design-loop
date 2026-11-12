import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Each page type with a primary slot holds its page's one primary action there.",
  fails: [
    "A page whose primary slot is missing, as when the shell is self-closed (`<Shell />`), or that renders the slot more than once; a slot that does not hold exactly one action control, or holds one that is not primary.",
    "A slot name the page type's shell does not define as `Object.assign(Root, { ... })`, in its module or a module it re-exports from, so a misspelled slot fails instead of matching nothing.",
    "A page type named there that renders no page, or that is not in `allowed_page_types`, and a config that names no page type, so the rule cannot go quiet.",
    "A page type in `allowed_page_types` with no shell module under `paths.pageTypes`, or whose module exports no shell.",
  ],
  details: [
    "The check does not name `DetailPage`: `shells.primarySlots` maps a page type to its slot, Meridian's `{ detail: \"Primary\" }`, and the shell's name comes from that page type's module. A second primary outside the slot is `check:priority`'s to catch.",
    "A variant computed from an expression, such as `variant={tone}`, counts as neither primary nor secondary, so one in the slot fails here and in `check:priority`.",
  ],
} satisfies CheckMeta;
