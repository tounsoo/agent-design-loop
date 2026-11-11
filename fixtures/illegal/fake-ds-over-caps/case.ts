/** Illegal under the stand-in adapter: two disclosures, two questions in the open, and the strong action inside a disclosure. */
export default {
  config: {
    adapter: "fixtures/fake-ds/adapter.ts",
    paths: {
      catalog: "fixtures/fake-ds/catalog/index.ts",
      features: "fixtures/illegal/fake-ds-over-caps",
    },
  },
  checks: [
    { run: "check:disclosure", fails: "page has 2 disclosures" },
    { run: "check:one-thing", fails: "shows 2 questions outside a disclosure" },
    { run: "check:priority", fails: "a primary button is inside a disclosure" },
  ],
};
