/** Illegal: an opt-out that names a proposal file that is not there. */
export default {
  config: {
    paths: {
      proposals: "packages/harness/fixtures/illegal/opt-out-missing-proposal",
    },
    optOuts: {
      "check:disclosure": "packages/harness/fixtures/illegal/opt-out-missing-proposal/0001-skip-disclosure.md",
    },
  },
  checks: [
    { run: "check:opt-outs", fails: "does not exist" },
  ],
};
