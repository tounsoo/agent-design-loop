/** Illegal: the declarations leave out one scenario, changes-requested, so nothing says what a screen reader hears there. */
export default {
  config: {
    flows: [
      {
        states: "packages/harness/fixtures/product/flows/states.ts",
        views: "packages/harness/fixtures/illegal/undeclared-scenario/views.ts",
      },
    ],
  },
  checks: [
    { run: "check:accessible-names", args: ["--list"], fails: 'declares nothing for "changes-requested"' },
  ],
};
