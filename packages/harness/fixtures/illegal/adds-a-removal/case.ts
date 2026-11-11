/** Illegal: the base has the side-panel layout and the change removes it, with a proposal the change adds that lists side-panel under adds. adds covers only members added, so a removal still needs a proposal decided on the base. */
export default {
  config: {},
  base: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/inventory-expansion/inputs.ts",
    },
  },
  proposals: "packages/harness/fixtures/illegal/adds-a-removal/proposals",
  checks: [
    { run: "check:inventories", fails: 'lists "side-panel" under adds, which this change removes or changes rather than adds' },
  ],
};
