/** Illegal: two primary buttons on one page, one of them imported under another name. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/aliased-second-primary",
    },
  },
  checks: [
    { run: "check:priority", fails: "page has 2 primary buttons" },
  ],
};
