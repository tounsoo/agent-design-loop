/** Illegal: the base inputs only `export * from` another module, so the check cannot tell whether the base exports allowed_layouts. */
export default {
  config: {},
  base: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/star-exported-base-inputs/base-inputs.ts",
    },
  },
  checks: [
    { run: "check:inventories", fails: "export *" },
  ],
};
