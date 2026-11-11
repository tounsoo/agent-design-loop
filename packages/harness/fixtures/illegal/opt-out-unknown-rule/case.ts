/** Illegal: an opt-out of a rule check:rules does not run. */
export default {
  config: {
    paths: {
      proposals: "packages/harness/fixtures/illegal/opt-out-unknown-rule",
    },
    optOuts: {
      "check:colors": "packages/harness/fixtures/illegal/opt-out-unknown-rule/0001-skip-colors.md",
    },
  },
  checks: [
    { run: "check:opt-outs", fails: "is not a rule in check:rules" },
  ],
};
