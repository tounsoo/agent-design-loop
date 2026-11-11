/** Illegal: line items shown in the open. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/missing-disclosed-section",
    },
  },
  checks: [
    { run: "check:priority", fails: "is not behind a disclosure" },
  ],
};
