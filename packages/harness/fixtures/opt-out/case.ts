/** Legal: the fixture product opts out of check:disclosure on a decided proposal that names the rule and the product. */
export default {
  config: {
    paths: {
      proposals: "packages/harness/fixtures/opt-out/proposals",
    },
    optOuts: {
      "check:disclosure": "packages/harness/fixtures/opt-out/proposals/0001-skip-disclosure.md",
    },
  },
  checks: [
    { run: "check:opt-outs", passes: "opts out of check:disclosure, each on a decided proposal" },
  ],
};
