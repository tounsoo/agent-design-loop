/** Illegal: the proposal is decided on the base and lists side-panel, but the change does not mark it adopted, so it could cover the next change too. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/inventory-expansion/inputs.ts",
      layouts: "packages/harness/fixtures/illegal/inventory-expansion/layouts",
    },
  },
  base: {},
  proposals: "packages/harness/fixtures/illegal/adoption-not-marked/proposals",
  baseProposals: "packages/harness/fixtures/illegal/adoption-not-marked/base-proposals",
  checks: [
    { run: "check:inventories", fails: 'Mark it "status: adopted" in this change' },
  ],
};
