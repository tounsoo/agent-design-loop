/** Illegal: the page's name is bold text, not an h1, so the check has no title to hold its headings to, and a screen reader has none to land on. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/page-without-a-title",
    },
  },
  checks: [
    { run: "check:rendered-page", fails: "detail page: no visible title" },
  ],
};
