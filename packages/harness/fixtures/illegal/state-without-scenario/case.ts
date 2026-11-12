/** Illegal: the modeled state changes-requested has no scenario, so no check opens it and no screenshot shows it. */
export default {
  config: {
    flows: [
      {
        states: "packages/harness/fixtures/illegal/state-without-scenario/states.ts",
        views: "packages/harness/fixtures/product/flows/views.ts",
      },
    ],
  },
  checks: [
    { run: "check:state-coverage", fails: 'has no scenario for the modeled state "changes-requested"' },
  ],
};
