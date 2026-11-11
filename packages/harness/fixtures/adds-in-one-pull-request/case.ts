/** Legal: the inputs add the side-panel layout, and the proposal the change adds lists only side-panel under adds, already graduated. A proposal that only adds graduates in the pull request that adds it. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/inventory-expansion/inputs.ts",
      layouts: "packages/harness/fixtures/illegal/inventory-expansion/layouts",
    },
  },
  base: {},
  proposals: "packages/harness/fixtures/adds-in-one-pull-request/proposals",
  checks: [
    { run: "check:inventories", passes: "0106-side-panel.md (only adds, so it graduates in the pull request that adds it, which a designer reviews)" },
  ],
};
