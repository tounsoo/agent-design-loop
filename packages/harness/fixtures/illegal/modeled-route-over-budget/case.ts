/** Illegal: a 2-step shortest path, and a 4-step modeled route to the same success, for a task with max_steps 3. */
export default {
  config: {
    flows: [
      {
        states: "packages/harness/fixtures/product/flows/states.ts",
        views: "packages/harness/fixtures/product/flows/views.ts",
        tasks: {
          "approve-vendor-invoice": "packages/harness/fixtures/illegal/modeled-route-over-budget/graph.ts",
        },
      },
    ],
  },
  checks: [
    {
      run: "check:step-budget",
      fails: "the modeled route open-invoice → flag → add-note → approve takes 4 steps, which exceeds max_steps 3",
    },
  ],
};
