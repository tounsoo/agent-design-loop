/** Illegal under the stand-in adapter: two strong actions in the primary slot. */
export default {
  config: {
    adapter: "fixtures/fake-ds/adapter.ts",
    paths: {
      catalog: "fixtures/fake-ds/catalog/index.ts",
      features: "fixtures/illegal/fake-ds-two-primaries",
    },
  },
  checks: [
    { run: "lint:slots", fails: "found 2 primary and 2 Action" },
  ],
};
