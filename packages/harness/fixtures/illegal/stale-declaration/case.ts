/** Illegal: the declarations name a preview the flow does not open, so they would compare nothing there. */
export default {
  config: {
    flows: [
      {
        states: "packages/harness/fixtures/product/flows/states.ts",
        views: "packages/harness/fixtures/illegal/stale-declaration/views.ts",
        previews: {
          ready: ["page=collection", "page=detail"],
        },
      },
    ],
  },
  checks: [
    { run: "check:accessible-names", args: ["--list"], fails: '"state=ready" is not a preview of this flow' },
  ],
};
