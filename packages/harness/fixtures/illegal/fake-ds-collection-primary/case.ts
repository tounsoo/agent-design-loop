/** Illegal under the stand-in adapter: a strong action on the collection page. */
export default {
  config: {
    adapter: "packages/harness/fixtures/fake-ds/adapter.ts",
    paths: {
      catalog: "packages/harness/fixtures/fake-ds/catalog/index.ts",
      features: "packages/harness/fixtures/illegal/fake-ds-collection-primary",
    },
  },
  checks: [
    { run: "check:one-thing", fails: "puts a primary button on the collection page" },
  ],
};
