/** Illegal: a 3-step task graph whose shipped reducer needs 2 steps. */
export default {
  config: {
    flows: [
      {
        states: "packages/harness/fixtures/product/flows/states.ts",
        views: "packages/harness/fixtures/product/flows/views.ts",
        tasks: {
          "approve-vendor-invoice": "packages/harness/fixtures/illegal/graph-flow-drift/graph.ts",
        },
      },
    ],
  },
  checks: [
    { run: "check:step-budget", fails: "does not match the modeled path" },
  ],
};
