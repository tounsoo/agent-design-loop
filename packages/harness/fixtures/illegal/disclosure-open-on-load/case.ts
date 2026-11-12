/** Illegal: Line items loads open, and no accessible-names.ts declares it expanded, so no state opens it. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/disclosure-open-on-load",
    },
  },
  checks: [
    { run: "check:rendered-page", fails: 'the disclosure "Line items" is open on load' },
  ],
};
