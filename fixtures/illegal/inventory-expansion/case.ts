/** Illegal: the inputs add the side-panel layout, with its directory, and no proposal. The base is the fixture product. */
export default {
  config: {
    paths: {
      inputs: "fixtures/illegal/inventory-expansion/inputs.ts",
      layouts: "fixtures/illegal/inventory-expansion/layouts",
    },
  },
  base: {},
  checks: [
    { run: "check:inventories", fails: "without a proposal" },
  ],
};
