/** Illegal: two flows both name a scenario "queue", so ?scenario=queue would open one of two cases. */
export default {
  config: {
    flows: [
      {
        states: "packages/harness/fixtures/product/flows/states.ts",
        views: "packages/harness/fixtures/product/flows/views.ts",
      },
      {
        states: "packages/harness/fixtures/illegal/duplicate-scenario-id/states.ts",
        views: "packages/harness/fixtures/product/flows/views.ts",
      },
    ],
  },
  checks: [
    { run: "check:state-coverage", fails: '"queue" is also a scenario in packages/harness/fixtures/product/flows/scenarios.ts' },
  ],
};
