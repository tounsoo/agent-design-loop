/** Illegal: one disclosure in each of two component files on one page. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/disclosures-per-page",
    },
  },
  checks: [
    { run: "check:disclosure", fails: "more than 1 per page" },
  ],
};
