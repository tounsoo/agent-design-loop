/** Illegal: the flow has no accessible-names.ts beside its views module. */
export default {
  config: {
    flows: [
      {
        states: "packages/harness/fixtures/product/flows/states.ts",
        views: "packages/harness/fixtures/illegal/no-declarations/views.ts",
      },
    ],
  },
  checks: [
    { run: "check:accessible-names", args: ["--list"], fails: "accessible-names.ts is missing. Beside the flow's views module" },
  ],
};
