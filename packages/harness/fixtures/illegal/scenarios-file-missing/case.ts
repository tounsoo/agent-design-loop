/** Illegal: the flow has no scenarios.ts beside its states module, so nothing says which cases to open. */
export default {
  config: {
    flows: [
      {
        states: "packages/harness/fixtures/illegal/scenarios-file-missing/states.ts",
        views: "packages/harness/fixtures/product/flows/views.ts",
      },
    ],
  },
  checks: [
    { run: "check:state-coverage", fails: "scenarios.ts is missing. Beside the flow's states module" },
  ],
};
