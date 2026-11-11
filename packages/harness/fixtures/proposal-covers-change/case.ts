/** Legal: the inputs add the side-panel layout, and the change graduates a proposal that was decided on the base and lists side-panel under changes. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/inventory-expansion/inputs.ts",
      layouts: "packages/harness/fixtures/illegal/inventory-expansion/layouts",
    },
  },
  base: {},
  proposals: "packages/harness/fixtures/proposal-covers-change/proposals",
  baseProposals: "packages/harness/fixtures/proposal-covers-change/base-proposals",
  checks: [
    { run: "check:inventories", passes: "Graduates packages/harness/fixtures/proposal-covers-change/proposals/0102-side-panel.md" },
  ],
};
