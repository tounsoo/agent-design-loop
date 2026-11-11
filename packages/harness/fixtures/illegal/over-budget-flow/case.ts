/** Illegal: a 3-step task graph whose shipped reducer needs 4 steps. */
export default {
  config: {
    flows: [
      {
        states: "packages/harness/fixtures/product/flows/states.ts",
        views: "packages/harness/fixtures/product/flows/views.ts",
        tasks: {
          "approve-vendor-invoice": "packages/harness/fixtures/illegal/over-budget-flow/graph.ts",
        },
      },
    ],
  },
  checks: [
    { run: "check:step-budget", fails: "shipped flow path length 4 exceeds max_steps" },
  ],
};
