/** Illegal: a primary button inside a disclosure, where the button and the disclosure are in different files. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/primary-in-imported-disclosure",
    },
  },
  checks: [
    { run: "check:priority", fails: "a primary button is inside a disclosure" },
  ],
};
