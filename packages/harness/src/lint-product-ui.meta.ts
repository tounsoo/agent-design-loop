import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "Product UI is built only from the product's catalog: no raw controls, no inline styles, no other component kit, nothing from another product.",
  fails: [
    "A design system import anywhere but the catalog, an import from one of the foreign component kits the check lists, or a relative import that reaches outside the product's own directories, such as into another product.",
    "A raw `button`, `input`, `select`, `textarea` or `a` element in product UI, or a `style` attribute outside the catalog.",
    "An import in any form: re-exports (`export ... from`), `import()`, `require()` (also as `globalThis.require` or `(0, require)`), `import x = require()` and Vite's `import.meta.glob` all count.",
    "A dynamic load whose specifier is not a string literal, because it cannot be checked, and `require` held under another name.",
  ],
  details: [
    "It reads the product's UI roots from the config: `paths.features`, `paths.pageTypes`, `paths.layouts`, `paths.contentLayouts`, `paths.app` and the catalog's own folder. The adapter's own packages are not foreign. A loader made with `createRequire` is not read. A product cannot opt out of this rule.",
  ],
} satisfies CheckMeta;
