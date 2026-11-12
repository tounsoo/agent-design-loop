/** Illegal: Line items loads open, and the flow's accessible-names.ts declares it closed on every preview, so no state opens it. */
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
