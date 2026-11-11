/** Illegal under the stand-in adapter: a disclosure and a question held outside any page. */
export default {
  config: {
    adapter: "packages/harness/fixtures/fake-ds/adapter.ts",
    paths: {
      catalog: "packages/harness/fixtures/fake-ds/catalog/index.ts",
      features: "packages/harness/fixtures/illegal/fake-ds-hoisted",
    },
  },
  checks: [
    { run: "check:disclosure", fails: "Reveal.Root is not reached from any page" },
    { run: "check:one-thing", fails: "Ask is not reached from any page" },
  ],
};
