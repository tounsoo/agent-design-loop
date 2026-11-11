/** Legal: inputs that disclose "Attachments", and pages that put it behind a disclosure. */
export default {
  config: {
    paths: {
      inputs: "fixtures/own-sections/inputs.ts",
      features: "fixtures/own-sections/features",
    },
  },
  checks: [
    { run: "check:priority", passes: 'disclosed: "Attachments"' },
  ],
};
