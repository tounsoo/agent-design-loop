/** Illegal: a 3-step task graph whose shipped reducer needs 2 steps. */
export default {
  config: {
    flows: [
      {
        states: "fixtures/product/flows/states.ts",
        views: "fixtures/product/flows/views.ts",
        tasks: {
          "approve-vendor-invoice": "fixtures/illegal/graph-flow-drift/graph.ts",
        },
      },
    ],
  },
  checks: [
    { run: "check:step-budget", fails: "does not match the modeled path" },
  ],
};
