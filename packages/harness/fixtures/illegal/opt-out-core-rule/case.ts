/** Illegal: an opt-out of check:inventories, a core rule, even on an adopted proposal that names it. */
export default {
  config: {
    paths: {
      proposals: "packages/harness/fixtures/illegal/opt-out-core-rule",
    },
    optOuts: {
      "check:inventories": "packages/harness/fixtures/illegal/opt-out-core-rule/0001-skip-inventories.md",
    },
  },
  checks: [
    { run: "check:opt-outs", fails: "cannot be opted out" },
  ],
};
