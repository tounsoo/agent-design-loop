/** Illegal: two buttons in the detail page's primary slot. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/two-primaries",
    },
  },
  checks: [
    { run: "lint:slots", fails: "accepts exactly one primary button, found 2 primary" },
  ],
};
