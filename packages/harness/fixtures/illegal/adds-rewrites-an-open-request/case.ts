/** Illegal: the inputs add the side-panel layout, and a request that is open on the base is rewritten in place as a proposal that only adds. A proposal on the base cannot become one that only adds: an open request is approved first. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/inventory-expansion/inputs.ts",
      layouts: "packages/harness/fixtures/illegal/inventory-expansion/layouts",
    },
  },
  base: {},
  proposals: "packages/harness/fixtures/illegal/adds-rewrites-an-open-request/proposals",
  baseProposals: "packages/harness/fixtures/illegal/adds-rewrites-an-open-request/base-proposals",
  checks: [
    { run: "check:inventories", fails: "is open on the base, so it cannot become a proposal that only adds" },
  ],
};
