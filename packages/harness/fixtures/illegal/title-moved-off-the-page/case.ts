/** Illegal: the page's only h1 is moved off the page, a way to hide it visually, so a sighted reader sees no title. A visually hidden h1 is not a title. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/title-moved-off-the-page",
    },
  },
  checks: [{ run: "check:rendered-page", fails: "detail page: no visible title" }],
};
