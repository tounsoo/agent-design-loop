/** Illegal: a 3-step task graph whose shipped reducer needs 4 steps. */
export default {
  config: {
    flows: [
      {
        states: "fixtures/product/flows/states.ts",
        views: "fixtures/product/flows/views.ts",
        tasks: {
          "approve-vendor-invoice": "fixtures/illegal/over-budget-flow/graph.ts",
        },
      },
    ],
  },
  checks: [
    { run: "check:step-budget", fails: "shipped flow path length 4 exceeds max_steps" },
  ],
};
