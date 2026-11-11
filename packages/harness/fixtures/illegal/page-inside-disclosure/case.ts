/** Illegal: a disclosure around the page shell hides its primary action. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/page-inside-disclosure",
    },
  },
  checks: [
    { run: "check:priority", fails: "a primary button is inside a disclosure" },
  ],
};
