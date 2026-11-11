/** Illegal under the stand-in adapter: a disclosure inside a disclosure. */
export default {
  config: {
    adapter: "packages/harness/fixtures/fake-ds/adapter.ts",
    paths: {
      catalog: "packages/harness/fixtures/fake-ds/catalog/index.ts",
      features: "packages/harness/fixtures/illegal/fake-ds-nested-reveal",
    },
  },
  checks: [
    { run: "check:disclosure", fails: "disclosure depth 2 exceeds 1" },
  ],
};
