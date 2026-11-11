/** Illegal: a flow whose states have no status field and a graph module with no flowStatus. */
export default {
  config: {
    flows: [
      {
        states: "packages/harness/fixtures/product/flows/states.ts",
        views: "packages/harness/fixtures/product/flows/views.ts",
        tasks: {
          "approve-vendor-invoice": "packages/harness/fixtures/illegal/flow-state-without-status/graph.ts",
        },
      },
    ],
  },
  checks: [
    { run: "check:step-budget", fails: "which has no status field" },
  ],
};
