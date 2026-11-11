/** Legal: re-exports and dynamic imports of the product's own catalog pass the off-catalog lint. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/catalog-loads",
    },
  },
  checks: [
    { run: "lint:product-ui", passes: "off-catalog: clean" },
  ],
};
