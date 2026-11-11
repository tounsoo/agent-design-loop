/** Illegal: a collection page rendered inside a detail page. */
export default {
  config: {
    paths: {
      features: "fixtures/illegal/nested-page",
    },
  },
  checks: [
    { run: "check:one-thing", fails: "DetailPage page renders a CollectionPage page inside it" },
  ],
};
