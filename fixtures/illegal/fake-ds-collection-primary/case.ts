/** Illegal under the stand-in adapter: a strong action on the collection page. */
export default {
  config: {
    adapter: "fixtures/fake-ds/adapter.ts",
    paths: {
      catalog: "fixtures/fake-ds/catalog/index.ts",
      features: "fixtures/illegal/fake-ds-collection-primary",
    },
  },
  checks: [
    { run: "check:one-thing", fails: "puts a primary button on the collection page" },
  ],
};
