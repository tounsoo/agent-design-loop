/** Illegal: two 12 CSS px links side by side in the chrome. They sit outside the [data-page] element, and the check measures the whole document. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/small-control-outside-page",
    },
  },
  checks: [
    { run: "check:target-size", fails: 'a "Help" is 12×12 CSS px and fails the spacing exception' },
  ],
};
