/** Illegal: with no viewport meta, Chrome lays a phone page out about 980 px wide and shrinks it to fit. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/no-phone-viewport",
    },
  },
  checks: [
    { run: "check:rendered-page", fails: 'px wide on a 390 px phone, so everything on it is shrunk. Add <meta name="viewport"' },
  ],
};
