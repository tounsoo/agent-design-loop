/** Legal: inputs that disclose "Attachments", and pages that put it behind a disclosure. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/own-sections/inputs.ts",
      features: "packages/harness/fixtures/own-sections/features",
    },
  },
  checks: [
    { run: "check:priority", passes: 'disclosed: "Attachments"' },
  ],
};
