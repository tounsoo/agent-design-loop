/** Illegal: an opt-out whose proposal is an open request, not a decision. */
export default {
  config: {
    paths: {
      proposals: "packages/harness/fixtures/illegal/opt-out-open-proposal",
    },
    optOuts: {
      "check:disclosure": "packages/harness/fixtures/illegal/opt-out-open-proposal/0001-skip-disclosure.md",
    },
  },
  checks: [
    { run: "check:opt-outs", fails: "is not decided" },
  ],
};
