import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "One job per page: no page inside a page, no primary on a collection or content page, and at most `MAX_VISIBLE_QUESTIONS` questions outside a disclosure.",
  fails: [
    "A page rendered inside another page, in its own JSX or through a component it renders, including one imported under another name.",
    "A page type in `allowed_page_types` that renders no page.",
    "A primary button on a collection page, including inside a content layout that page uses.",
    "A primary button on a content page, one whose page type is under `shells.content`, anywhere it reaches but the chrome layouts every page shares, and a button there whose variant is computed, so the check cannot tell it is not primary.",
    "More questions outside a disclosure on one page than `MAX_VISIBLE_QUESTIONS`. A question is the adapter's question part, Todae's `Field.Root`.",
    "A chrome slot in `shells.collections` that the collection's shell does not define, or that it names for a shell not defined as `Object.assign(Root, { ... })`; a page type there that is not in `allowed_page_types`; and an allowed page type named in none or more than one of `shells.primarySlots`, `shells.collections` and `shells.content`, or a page type under `shells.content` that is not in `allowed_page_types`.",
    "A page type in `allowed_page_types` with no shell module under `paths.pageTypes`, or whose module exports no shell.",
    "A catalog that stops exporting the question part, so the cap cannot go quiet.",
  ],
  details: [
    "A page type is one of three kinds in the config's `shells`: `primarySlots`, one primary action in a named slot; `collections`, no primary and a registered content layout in the body; or the optional `content`, a page that shows information, such as a help or policy page, and holds no primary button outside the shared chrome layouts.",
    "`allowed_page_types` decides which shells exist, and this check reads that inventory rather than a second list. The rules hold per page, not per product: a product may render a page type as often as it needs, from as many files. Which page types are collections, and which of their slots are chrome rather than body, comes from `shells.collections`, Meridian's `{ collection: [\"Heading\", \"Description\"] }`.",
    "The check reads code, not runtime state. A field shown only on a branch still counts, and both arms of one ternary count even if only one shows at a time. Menu-based filter facets are not questions. A page held in a variable and rendered as `{others}` is not seen as nested.",
  ],
} satisfies CheckMeta;
