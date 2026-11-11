/** Illegal: a detail page, imported under another name, rendered inside a collection page. */
export default {
  config: {
    paths: {
      features: "fixtures/illegal/aliased-nested-page",
    },
  },
  checks: [
    { run: "check:one-thing", fails: "CollectionPage page renders a DetailPage page inside it" },
  ],
};
