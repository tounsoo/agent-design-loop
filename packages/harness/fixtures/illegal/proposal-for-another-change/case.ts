/** Illegal: the inputs add the side-panel layout, and the one new proposal is about a catalog export. A proposal covers only the change it names. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/inventory-expansion/inputs.ts",
      layouts: "packages/harness/fixtures/illegal/inventory-expansion/layouts",
    },
  },
  base: {},
  proposals: "packages/harness/fixtures/illegal/proposal-for-another-change/proposals",
  checks: [
    { run: "check:inventories", fails: 'No new proposal covers it: one proposal must name "side-panel"' },
  ],
};
