/** Illegal: a status board with page CSS as a collection's ready body, which is not a registered content layout. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/ad-hoc-content",
      styles: "packages/harness/fixtures/illegal/ad-hoc-content/styles.css",
    },
  },
  checks: [
    { run: "check:inventories", fails: "not a registered content layout" },
  ],
};
