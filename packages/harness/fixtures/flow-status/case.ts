/** Legal: a flow whose states keep their name in phase, read through the graph module's flowStatus. */
export default {
  config: {
    flows: [
      {
        states: "packages/harness/fixtures/product/flows/states.ts",
        views: "packages/harness/fixtures/product/flows/views.ts",
        tasks: {
          "approve-vendor-invoice": "packages/harness/fixtures/flow-status/graph.ts",
        },
      },
    ],
  },
  checks: [
    { run: "check:step-budget", passes: "step budget: within budget." },
  ],
};
