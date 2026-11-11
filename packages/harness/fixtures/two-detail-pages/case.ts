/** Legal: two detail pages, each with one primary Approve. Priority holds per page, so a product may render the rank-1 action on as many pages as it needs. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/two-detail-pages",
    },
  },
  checks: [
    { run: "check:priority", passes: '"Approve" is the primary button on 2 of 2 pages' },
    { run: "lint:slots", passes: "exactly one primary button on 2 detail page" },
  ],
};
