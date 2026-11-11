/** Illegal: `import()` of the design system outside the catalog, and an `import()` the lint cannot read. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/dynamic-design-system-import",
    },
  },
  checks: [
    { run: "lint:product-ui", fails: 'off-catalog: import "@tounsoo/todae" directly' },
    { run: "lint:product-ui", fails: "with a computed specifier cannot be checked" },
  ],
};
