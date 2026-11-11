/** Illegal: a side-panel layout directory that allowed_layouts does not list. */
export default {
  config: {
    paths: {
      layouts: "fixtures/illegal/undeclared-layout/layouts",
    },
  },
  checks: [
    { run: "check:inventories", fails: "undeclared layout" },
  ],
};
