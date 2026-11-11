/** Illegal: a catalog that no longer exports the question part, so the question cap could go quiet. */
export default {
  config: {
    paths: {
      catalog: "packages/harness/fixtures/illegal/dead-question-part/catalog.ts",
    },
  },
  checks: [
    { run: "check:one-thing", fails: "not exported by the catalog" },
  ],
};
