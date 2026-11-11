/** Illegal: two primary buttons on one page, one of them written as `UI.Button.Root` through `import * as UI`. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/namespace-second-primary",
    },
  },
  checks: [
    { run: "check:priority", fails: "page has 2 primary buttons" },
  ],
};
