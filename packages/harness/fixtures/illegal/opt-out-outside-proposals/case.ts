/** Illegal: an opt-out whose proposal sits outside the config's proposals directory, where CODEOWNERS does not ask for review. */
export default {
  config: {
    optOuts: {
      "check:disclosure": "packages/harness/fixtures/illegal/opt-out-outside-proposals/0001-skip-disclosure.md",
    },
  },
  checks: [
    { run: "check:opt-outs", fails: "is not a proposal file directly in" },
  ],
};
