/** Illegal: two questions in the open on one page. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/two-questions",
    },
  },
  checks: [
    { run: "check:one-thing", fails: "questions outside a disclosure" },
  ],
};
