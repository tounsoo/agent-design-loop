/**
 * Illegal: a file beside the catalog, in the catalog's folder, re-exports a
 * design system part the catalog leaves out, and a page imports it from there,
 * past the catalog and its inventory. Only the catalog file imports the
 * design system.
 */
export default {
  config: {
    paths: {
      catalog: "packages/harness/fixtures/illegal/catalog-side-door/catalog/index.ts",
      features: "packages/harness/fixtures/illegal/catalog-side-door/features",
    },
  },
  checks: [
    { run: "lint:product-ui", fails: 'extra.ts:2: off-catalog: import "@tounsoo/todae" directly' },
  ],
};
