/** Illegal: an `export ... from` of the design system outside the catalog. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/re-exported-design-system",
    },
  },
  checks: [
    { run: "lint:product-ui", fails: 'off-catalog: import "@tounsoo/todae" directly' },
  ],
};
