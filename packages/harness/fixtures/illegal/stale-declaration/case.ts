/** Illegal: the declarations name a scenario the flow does not have, so they would compare nothing there. */
export default {
  config: {
    flows: [
      {
        states: "packages/harness/fixtures/product/flows/states.ts",
        views: "packages/harness/fixtures/illegal/stale-declaration/views.ts",
      },
    ],
  },
  checks: [
    { run: "check:accessible-names", args: ["--list"], fails: '"ready" is not a scenario of this flow' },
  ],
};
