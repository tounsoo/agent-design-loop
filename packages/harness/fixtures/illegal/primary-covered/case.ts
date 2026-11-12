/** Illegal: Approve sits in the first view, but a fixed banner lies over it, so a person cannot reach it without dismissing something first. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/primary-covered",
    },
  },
  checks: [
    { run: "check:rendered-page", fails: 'but div.cookie-banner "We use cookies." covers its centre' },
  ],
};
