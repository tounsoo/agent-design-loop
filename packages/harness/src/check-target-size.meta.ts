import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Every control on every preview is at least 24 CSS px, or meets the WCAG 2.5.8 spacing exception, measured in headless Chrome.",
  flags: [{ name: "--list", what: "Prints the previews it would open, without building or Chrome." }],
  fails: [
    "A control under 24 CSS px on a side that misses the WCAG 2.5.8 spacing exception, anywhere in the document: the page and the chrome around it, with each closed disclosure opened on its own.",
    "A button token floor under 24: the font size plus twice the vertical padding of the design system the adapter names.",
    "A `previews` entry for a state that is not modeled, or one that sets `state` itself.",
    "No Chrome found.",
  ],
  details: [
    "It builds the directory in `paths.web`, serves it with `vite preview` on port 4173, and opens every state in each flow's `modeledStates` at 1280 by 900: bare, or once per query string that flow's `previews` in the config lists for it, such as `page=detail`. A state added later is opened without editing the script. A state that renders no `[data-page]` element is measured too. It clicks a disclosure summary on the page when one is present and measures, then opens every other closed disclosure in the document, such as a menu in the chrome, one at a time, measures what it shows, and closes it again.",
    "It measures each preview on load and after a disclosure opens, at one width. The floor is `TARGET_MIN_PX` in the product's rules module. It closes the server and the browser itself.",
  ],
} satisfies CheckMeta;
