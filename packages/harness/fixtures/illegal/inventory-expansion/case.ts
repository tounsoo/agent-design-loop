/** Illegal: the inputs add the side-panel layout, with its directory, and no proposal. The base is the fixture product. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/inventory-expansion/inputs.ts",
      layouts: "packages/harness/fixtures/illegal/inventory-expansion/layouts",
    },
  },
  base: {},
  checks: [
    { run: "check:inventories", fails: "without a proposal" },
  ],
};
