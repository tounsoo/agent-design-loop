/** Illegal: an opt-out that borrows a proposal written for another product. */
export default {
  config: {
    paths: {
      proposals: "packages/harness/fixtures/illegal/opt-out-other-product",
    },
    optOuts: {
      "check:disclosure": "packages/harness/fixtures/illegal/opt-out-other-product/0001-skip-disclosure.md",
    },
  },
  checks: [
    { run: "check:opt-outs", fails: "does not opt out check:disclosure for" },
  ],
};
