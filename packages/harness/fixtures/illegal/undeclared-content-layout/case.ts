/** Illegal: a board content layout directory that allowed_content_layouts does not list. */
export default {
  config: {
    paths: {
      contentLayouts: "packages/harness/fixtures/illegal/undeclared-content-layout/content-layouts",
    },
  },
  checks: [
    { run: "check:inventories", fails: "undeclared content layout" },
  ],
};
