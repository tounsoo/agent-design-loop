/** Illegal: the change graduates a decided proposal whose changes list `layouts/side-panel/`, a path, not the member side-panel. A proposal lists each name exactly. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/inventory-expansion/inputs.ts",
      layouts: "packages/harness/fixtures/illegal/inventory-expansion/layouts",
    },
  },
  base: {},
  proposals: "packages/harness/fixtures/illegal/proposal-names-path/proposals",
  baseProposals: "packages/harness/fixtures/illegal/proposal-names-path/base-proposals",
  checks: [
    { run: "check:inventories", fails: 'a decided proposal must list "side-panel" under changes, and none graduating lists' },
  ],
};
