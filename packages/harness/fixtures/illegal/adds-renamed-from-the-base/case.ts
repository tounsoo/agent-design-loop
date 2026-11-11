/** Illegal: the inputs add the side-panel layout, and the proposal that lists it under adds is a proposal from the base under a new file name. A member a base proposal already lists under adds comes back only through a proposal decided on the base. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/inventory-expansion/inputs.ts",
      layouts: "packages/harness/fixtures/illegal/inventory-expansion/layouts",
    },
  },
  base: {},
  proposals: "packages/harness/fixtures/illegal/adds-renamed-from-the-base/proposals",
  baseProposals: "packages/harness/fixtures/illegal/adds-renamed-from-the-base/base-proposals",
  checks: [
    { run: "check:inventories", fails: "which a proposal on the base already lists under adds" },
  ],
};
