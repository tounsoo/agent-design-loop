/** Illegal: a task graph that needs 4 steps for a task with max_steps 3. */
export default {
  config: {
    flows: [
      {
        states: "fixtures/product/flows/states.ts",
        views: "fixtures/product/flows/views.ts",
        tasks: {
          "approve-vendor-invoice": "fixtures/illegal/over-budget/graph.ts",
        },
      },
    ],
  },
  checks: [
    { run: "check:step-budget", fails: "modeled path length 4 exceeds max_steps" },
  ],
};
