/** Illegal under the stand-in adapter: its package imported outside the catalog. */
export default {
  config: {
    adapter: "fixtures/fake-ds/adapter.ts",
    paths: {
      catalog: "fixtures/fake-ds/catalog/index.ts",
      features: "fixtures/illegal/fake-ds-off-catalog",
    },
  },
  checks: [
    { run: "lint:product-ui", fails: 'off-catalog: import "@fake/ds" directly' },
  ],
};
