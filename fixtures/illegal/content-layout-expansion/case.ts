/** Illegal: the inputs add the board content layout, with its directory, and no proposal. The base is the fixture product. */
export default {
  config: {
    paths: {
      inputs: "fixtures/illegal/content-layout-expansion/inputs.ts",
      contentLayouts: "fixtures/illegal/content-layout-expansion/content-layouts",
    },
  },
  base: {},
  checks: [
    { run: "check:inventories", fails: "without a proposal" },
  ],
};
