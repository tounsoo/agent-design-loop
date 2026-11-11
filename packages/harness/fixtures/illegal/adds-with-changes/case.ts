/** Illegal: the inputs add the side-panel layout, and the proposal the change adds lists side-panel under adds and TARGET_MIN_PX under changes. A proposal that adds in one pull request lists nothing else, so this one does not parse and covers nothing. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/inventory-expansion/inputs.ts",
      layouts: "packages/harness/fixtures/illegal/inventory-expansion/layouts",
    },
  },
  base: {},
  proposals: "packages/harness/fixtures/illegal/adds-with-changes/proposals",
  checks: [
    { run: "check:inventories", fails: "lists adds alongside changes" },
  ],
};
