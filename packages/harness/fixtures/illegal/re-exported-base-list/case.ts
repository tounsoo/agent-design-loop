/** Illegal: the base exports allowed_layouts as `export { layouts as allowed_layouts }`, and the change adds the side-panel layout with no proposal. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/inventory-expansion/inputs.ts",
      layouts: "packages/harness/fixtures/illegal/inventory-expansion/layouts",
    },
  },
  base: {
    paths: {
      inputs: "packages/harness/fixtures/re-exported-inputs/base-inputs.ts",
    },
  },
  checks: [
    { run: "check:inventories", fails: "allowed_layouts changed from" },
  ],
};
