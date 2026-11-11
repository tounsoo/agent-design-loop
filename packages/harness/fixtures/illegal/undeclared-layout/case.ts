/** Illegal: a side-panel layout directory that allowed_layouts does not list. */
export default {
  config: {
    paths: {
      layouts: "packages/harness/fixtures/illegal/undeclared-layout/layouts",
    },
  },
  checks: [
    { run: "check:inventories", fails: "undeclared layout" },
  ],
};
