/** Illegal: the declarations leave out one preview, changes-requested, so nothing says what a screen reader hears there. */
export default {
  config: {
    flows: [
      {
        states: "packages/harness/fixtures/product/flows/states.ts",
        views: "packages/harness/fixtures/illegal/undeclared-preview/views.ts",
        previews: {
          ready: ["page=collection", "page=detail"],
        },
      },
    ],
  },
  checks: [
    { run: "check:accessible-names", args: ["--list"], fails: 'declares nothing for "state=changes-requested"' },
  ],
};
