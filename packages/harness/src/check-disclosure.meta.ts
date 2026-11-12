import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Each page holds at most `MAX_DISCLOSURES_PER_PAGE` disclosures, nested at most `MAX_DISCLOSURE_DEPTH` deep.",
  fails: [
    "A page with more `Disclosure.Root` elements than `MAX_DISCLOSURES_PER_PAGE`, counted across every component the page renders.",
    "Disclosures nested deeper than `MAX_DISCLOSURE_DEPTH`, followed across components.",
    "A disclosure in the features path that no page reaches, such as JSX held in a variable outside the shell, because a per-page cap cannot count it.",
    "No page found, or a catalog that stops exporting the adapter's disclosure.",
  ],
  details: [
    "A page is one rendered page-type shell in the config's `paths.features`, plus what renders on it: components its JSX uses (local, or imported from a relative path), its content layouts, the page-type shell module, and the chrome layouts. `lib/page-scope.ts` builds that scope, and `check:priority` and `check:one-thing` use the same one. It follows JSX tags and calls to helper functions, undoes import aliases such as `Field as F`, and follows a component imported under another name, a default export, and a named export through a barrel's `export { X } from` or `export *`.",
    "The caps come from the product's `rules` module. It does not read whether a disclosure starts open, or what sits outside disclosures.",
  ],
} satisfies CheckMeta;
