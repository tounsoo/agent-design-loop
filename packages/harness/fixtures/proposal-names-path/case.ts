/** Legal: the inputs add the side-panel layout, and a new proposal names it only inside a path, `layouts/side-panel/`. A path with the member in it names the member. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/inventory-expansion/inputs.ts",
      layouts: "packages/harness/fixtures/illegal/inventory-expansion/layouts",
    },
  },
  base: {},
  proposals: "packages/harness/fixtures/proposal-names-path/proposals",
  checks: [
    { run: "check:inventories", passes: "Covered by packages/harness/fixtures/proposal-names-path/proposals/0104-frame-beside-page.md" },
  ],
};
