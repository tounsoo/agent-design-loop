/** Illegal: a scenario has a page but no state, so it names no case the flow handles. */
export default {
  config: {
    flows: [
      {
        states: "packages/harness/fixtures/illegal/scenario-without-state/states.ts",
        views: "packages/harness/fixtures/product/flows/views.ts",
      },
    ],
  },
  checks: [
    { run: "check:state-coverage", fails: '"invoice-detail" must be an object with a state' },
  ],
};
