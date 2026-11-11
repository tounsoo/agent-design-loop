/** Illegal: the inputs add the side-panel layout, and the only proposal that lists it under adds is already on the base. A proposal that only adds covers its members in the pull request that adds it, once, so it cannot let a later change through. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/inventory-expansion/inputs.ts",
      layouts: "packages/harness/fixtures/illegal/inventory-expansion/layouts",
    },
  },
  base: {},
  proposals: "packages/harness/fixtures/illegal/adds-adopted-before/proposals",
  baseProposals: "packages/harness/fixtures/illegal/adds-adopted-before/base-proposals",
  checks: [
    { run: "check:inventories", fails: "added its members in an earlier pull request" },
  ],
};
