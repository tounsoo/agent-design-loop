import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary:
    "Every preview, as Chrome paints it at desktop and phone width: section headings two type-scale steps below the title, the rank-1 action in the first view, disclosures closed unless the state opens them, AA contrast in light and dark, and no sideways scroll on a phone.",
  fails: [
    "A heading on a page, a disclosure summary included, that sits fewer than two steps below the page's title on the design system's type scale, or fewer than one step when it is inside a list item or table row. The title is the first visible h1, or `role=\"heading\"` at level 1, in each `[data-page]` element. Measured at 1280 by 900 and 390 by 844.",
    "A page with no visible title, and a preview with no `[data-page]` element.",
    "On a page type with a primary slot, a rank-1 action from `priority` that is not whole inside the first view, or whose centre something else covers, at 1280 by 900 or 390 by 844, before any scroll; and such a page that shows no rank-1 action at all.",
    "A disclosure, a `<details>` whose summary a person can see, that is open on load, unless the flow's `accessible-names.ts` declares it with `expanded: true` on that preview.",
    "A run of text under WCAG AA contrast, 4.5:1, or 3:1 for large text, against what is painted under it, in the light or the dark colour scheme, anywhere in the document.",
    "A document wider than the view at 390 by 844, so the page scrolls sideways. The message names the first elements past the edge.",
    "A design system stylesheet with no type scale: no family of at least three tokens named `--<prefix>font-size-<n>`.",
    "A `previews` entry that cannot be listed, a `paths.web` that does not build or serve, and no Chrome found, as `check:target-size` fails them.",
  ],
  details: [
    "It builds and serves the app as `check:target-size` does, or uses the build `check:product` serves, and opens the same previews three times: at 1280 by 900 in the light colour scheme, at 1280 by 900 in the dark one, and at 390 by 844 as a phone, light. It reads each as it loads and presses nothing. Every rule is a pattern that holds on any page: no number is set per page or per page type, and the steps, the views and the AA ratios are the harness's, not a product input. [Proposal 2026-11-12-rendered-page](../../../proposals/2026-11-12-rendered-page.md) records the rule.",
    "The type scale is the numbered font-size tokens in the stylesheet the adapter names, read the way `check:target-size` reads its button tokens: Todae's `--todae-font-size-1` to `-6`, 12 to 30 px. A size between two steps counts as the lower one. With Todae's 30 px title, section headings are 20 px or smaller and record names in a list 24 px or smaller. Only size counts, so a heading set apart by weight or colour alone passes.",
    "The rank-1 action is found by its accessible name, the `action` of each `priority` item at rank 1, among the page's buttons and links. One copy whole in view with nothing over its centre passes, so a pinned action row passes by design. Content and collection pages hold no primary, so they are not measured.",
    "Contrast reads every text node a person can see, the chrome's included, against the background colours of its element and its ancestors, down to the first opaque one, over the canvas Chrome paints for the root's colour scheme. Text over a background image or gradient is skipped and counted in the last line. Text in a control that is turned off is exempt, as WCAG allows. It emulates `prefers-color-scheme`, so a product whose tokens follow the system scheme is read in both. A field's own value and placeholder are not text nodes, so they are not read.",
    "It sees only what each preview shows as it loads: a state a press reveals, data no preview renders, and a long page with correct hierarchy pass. The critique of the screenshots judges those.",
  ],
} satisfies CheckMeta;
