/** Illegal: the own-sections inputs, which disclose "Attachments", on the fixture product's pages, which disclose only Line items. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/own-sections/inputs.ts",
    },
  },
  checks: [
    { run: "check:priority", fails: '"Attachments" is not behind a disclosure' },
  ],
};
