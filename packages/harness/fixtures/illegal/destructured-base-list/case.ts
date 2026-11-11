/** Illegal: the base exports allowed_layouts through a destructuring declaration, which is not a list the check can read. */
export default {
  config: {},
  base: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/destructured-base-list/base-inputs.ts",
    },
  },
  checks: [
    { run: "check:inventories", fails: "allowed_layouts is not a string array" },
  ],
};
