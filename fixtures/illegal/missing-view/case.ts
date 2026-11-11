/** Illegal: invoice-approved is modeled and has no view. */
export default {
  config: {
    flows: [
      {
        states: "fixtures/illegal/missing-view/model.ts",
        views: "fixtures/illegal/missing-view/views.ts",
      },
    ],
  },
  checks: [
    { run: "check:state-coverage", fails: "has no view" },
  ],
};
