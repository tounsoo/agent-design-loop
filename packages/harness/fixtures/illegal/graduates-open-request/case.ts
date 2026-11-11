/** Illegal: the change graduates a proposal that is an open request on the base. Approval, open to decided, is its own pull request. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/inventory-expansion/inputs.ts",
      layouts: "packages/harness/fixtures/illegal/inventory-expansion/layouts",
    },
  },
  base: {},
  proposals: "packages/harness/fixtures/illegal/graduates-open-request/proposals",
  baseProposals: "packages/harness/fixtures/illegal/graduates-open-request/base-proposals",
  checks: [
    { run: "check:inventories", fails: "is an open request on the base" },
  ],
};
