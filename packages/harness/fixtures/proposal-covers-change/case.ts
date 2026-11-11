/** Legal: the inputs add the side-panel layout, and a new proposal names it. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/inventory-expansion/inputs.ts",
      layouts: "packages/harness/fixtures/illegal/inventory-expansion/layouts",
    },
  },
  base: {},
  proposals: "packages/harness/fixtures/proposal-covers-change/proposals",
  checks: [
    { run: "check:inventories", passes: "Covered by packages/harness/fixtures/proposal-covers-change/proposals/0102-side-panel.md" },
  ],
};
