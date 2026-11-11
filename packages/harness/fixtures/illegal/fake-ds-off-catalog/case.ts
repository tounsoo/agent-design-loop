/** Illegal under the stand-in adapter: its package imported outside the catalog. */
export default {
  config: {
    adapter: "packages/harness/fixtures/fake-ds/adapter.ts",
    paths: {
      catalog: "packages/harness/fixtures/fake-ds/catalog/index.ts",
      features: "packages/harness/fixtures/illegal/fake-ds-off-catalog",
    },
  },
  checks: [
    { run: "lint:product-ui", fails: 'off-catalog: import "@fake/ds" directly' },
  ],
};
