import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Every control on every scenario, at desktop and phone width, is at least 24 CSS px, or meets the WCAG 2.5.8 spacing exception, measured in headless Chrome.",
  flags: [{ name: "--list", what: "Prints the scenarios it would open, without building or Chrome." }],
  fails: [
    "A control under 24 CSS px on a side that misses the WCAG 2.5.8 spacing exception, anywhere in the document: the page and the chrome around it, with each closed disclosure opened on its own.",
    "A button token floor under 24: the font size plus twice the vertical padding of the design system the adapter names.",
    "Every scenario problem `check:state-coverage` fails, before Chrome starts, and a flow whose states file does not export `modeledStates` as a list of strings.",
    "A `paths.web` outside the repository or with no `index.html`, an app that does not build, and a built app that cannot be served.",
    "No Chrome found.",
  ],
  details: [
    "It builds the directory in `paths.web`, serves it with `vite preview` on a free port of 127.0.0.1, or uses the build `check:product` already serves for this product, and opens every scenario in each flow's `scenarios.ts` at `?scenario=<id>`, at 1280 by 900 and at 390 by 844 as a phone, both in the light colour scheme. A scenario added later is opened without editing the script. A scenario that renders no `[data-page]` element is measured too. It clicks a disclosure summary on the page when one is present and measures, then opens every other closed disclosure in the document, such as a menu in the chrome, one at a time, measures what it shows, and closes it again.",
    "It measures each scenario on load and after a disclosure opens, in each width. The floor is `TARGET_MIN_PX` in the product's rules module. It closes the server and the browser itself.",
  ],
} satisfies CheckMeta;
