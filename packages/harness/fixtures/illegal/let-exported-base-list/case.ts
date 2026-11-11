/** Illegal: the base exports allowed_layouts from a reassigned `let`, so the check cannot read the exported list from its initializer. */
export default {
  config: {},
  base: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/let-exported-base-list/base-inputs.ts",
    },
  },
  checks: [
    { run: "check:inventories", fails: "allowed_layouts is not a string array" },
  ],
};
