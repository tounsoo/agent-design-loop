/** Illegal: the flow's scenarios.ts exports its cases under another name, so the checks would open nothing. */
export default {
  config: {
    flows: [
      {
        states: "packages/harness/fixtures/illegal/scenarios-not-exported/states.ts",
        views: "packages/harness/fixtures/product/flows/views.ts",
      },
    ],
  },
  checks: [
    { run: "check:state-coverage", fails: 'does not export scenarios as an object of scenario id to' },
  ],
};
