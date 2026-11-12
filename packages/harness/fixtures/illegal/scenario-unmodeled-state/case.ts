/** Illegal: a scenario renders "confirming", which is not a modeled state, so it opens nothing the flow promises to handle. */
export default {
  config: {
    flows: [
      {
        states: "packages/harness/fixtures/illegal/scenario-unmodeled-state/states.ts",
        views: "packages/harness/fixtures/product/flows/views.ts",
      },
    ],
  },
  checks: [
    { run: "check:state-coverage", fails: 'scenarios.ts "confirming" renders "confirming", which is not a modeled state' },
    { run: "check:target-size", args: ["--list"], fails: "which is not a modeled state" },
  ],
};
