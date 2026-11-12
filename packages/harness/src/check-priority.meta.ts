import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Each page holds at most one primary action, and it is the product's rank-1 action; the rank-2 action is secondary; `disclosed_sections` stay behind disclosures.",
  fails: [
    "On a page: more than one primary button, a primary whose text is not the rank-1 action in `priority` (Meridian's Approve), or a primary inside a disclosure, including one in a component the page renders.",
    "On a page: the rank-2 action (Meridian's Request changes) shown as primary or more than once.",
    "On any page: an action button whose variant is computed, such as `variant={tone}`, because it could be a second primary.",
    "Across the product: no page with the rank-1 primary, or a rank-1 or rank-2 button no page reaches.",
    "A section in `disclosed_sections` that is not the text of a `Disclosure.Summary`.",
  ],
  details: [
    "The rules hold per page, in the page scope `check:disclosure` describes, with import aliases undone and `UI.Button.Root` through `import * as UI` read too. A product may render as many pages as it needs, so two record pages may each hold the rank-1 action. Actions are matched by their button text, so a translation breaks the match.",
    "Write a button's variant as a plain string, as in `variant=\"secondary\"`. A braced literal, `variant={\"secondary\"}`, is read as the variant too, but also as part of the button's text, so \"Request changes\" becomes \"secondary Request changes\" and the check fails. A button with no variant is primary, because the adapter says Todae's default is.",
    "Two shapes are not seen: a button passed as children into a component that wraps its children in a disclosure, and a tag held in a local variable, such as `const Control = Button`. The sections in `disclosed_sections` come from the product's inputs, not from the script.",
  ],
} satisfies CheckMeta;
