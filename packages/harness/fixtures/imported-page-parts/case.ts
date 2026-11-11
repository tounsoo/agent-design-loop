/** Legal: the page's actions and disclosure come in under an alias, as a default export, and through an `export *` barrel. The page scope follows each, so priority sees them on the page. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/imported-page-parts",
    },
  },
  checks: [
    { run: "check:priority", passes: '"Approve" is the primary button on 1 of 1 pages' },
    { run: "check:disclosure", passes: "at most 1 per page, across 1 pages" },
  ],
};
