/** Illegal: the inputs add the side-panel layout, and the proposal that lists it is added in the same change. A proposal graduates only after a designer has approved it on the base. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/inventory-expansion/inputs.ts",
      layouts: "packages/harness/fixtures/illegal/inventory-expansion/layouts",
    },
  },
  base: {},
  proposals: "packages/harness/fixtures/illegal/graduates-with-its-proposal/proposals",
  checks: [
    { run: "check:inventories", fails: "is added in this change" },
  ],
};
