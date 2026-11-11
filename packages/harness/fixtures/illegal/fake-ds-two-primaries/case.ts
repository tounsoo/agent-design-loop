/** Illegal under the stand-in adapter: two strong actions in the primary slot. */
export default {
  config: {
    adapter: "packages/harness/fixtures/fake-ds/adapter.ts",
    paths: {
      catalog: "packages/harness/fixtures/fake-ds/catalog/index.ts",
      features: "packages/harness/fixtures/illegal/fake-ds-two-primaries",
    },
  },
  checks: [
    { run: "lint:slots", fails: "found 2 primary and 2 Action" },
  ],
};
