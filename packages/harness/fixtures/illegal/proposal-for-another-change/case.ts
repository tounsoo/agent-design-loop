/** Illegal: the inputs add the side-panel layout, and the one adopted proposal is about a catalog export. A proposal covers only the change it lists. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/inventory-expansion/inputs.ts",
      layouts: "packages/harness/fixtures/illegal/inventory-expansion/layouts",
    },
  },
  base: {},
  proposals: "packages/harness/fixtures/illegal/proposal-for-another-change/proposals",
  baseProposals: "packages/harness/fixtures/illegal/proposal-for-another-change/base-proposals",
  checks: [
    { run: "check:inventories", fails: 'a decided proposal must list "side-panel" under changes' },
  ],
};
