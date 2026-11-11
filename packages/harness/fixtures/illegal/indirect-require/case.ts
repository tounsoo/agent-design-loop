/** Illegal: `globalThis.require(...)`, `(0, require)(...)` and `require` held under another name load the design system outside the catalog. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/indirect-require",
    },
  },
  checks: [
    { run: "lint:product-ui", fails: 'off-catalog: import "@tounsoo/todae" directly' },
    { run: "lint:product-ui", fails: 'off-catalog: import "@tounsoo/todae/styles.css" directly' },
    { run: "lint:product-ui", fails: "require is held under another name" },
  ],
};
