/** Illegal: a scenario id is not a lowercase slug, so it would not read in an address, a screenshot's file name or a message. */
export default {
  config: {
    flows: [
      {
        states: "packages/harness/fixtures/illegal/scenario-not-a-slug/states.ts",
        views: "packages/harness/fixtures/product/flows/views.ts",
      },
    ],
  },
  checks: [
    { run: "check:state-coverage", fails: '"Invoice_Queue" is not a lowercase slug' },
  ],
};
