/** Illegal: the base exports allowed_layouts as a function, so the name is exported but is not a list the check can read. */
export default {
  config: {},
  base: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/function-exported-base-list/base-inputs.ts",
    },
  },
  checks: [
    { run: "check:inventories", fails: "allowed_layouts is not a string array" },
  ],
};
