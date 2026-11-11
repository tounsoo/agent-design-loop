/** Legal: the base exports allowed_layouts, allowed_content_layouts and disclosed_sections through export clauses, and the change keeps the same members as plain exports. */
export default {
  config: {},
  base: {
    paths: {
      inputs: "packages/harness/fixtures/re-exported-inputs/base-inputs.ts",
    },
  },
  checks: [
    { run: "check:inventories", passes: "membership matches" },
  ],
};
