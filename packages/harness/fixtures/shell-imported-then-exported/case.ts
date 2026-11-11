/** Legal: the detail page type's index.ts imports its shell and then exports it. The slot names are read through that import. */
export default {
  config: {
    paths: {
      pageTypes: "packages/harness/fixtures/shell-imported-then-exported/page-types",
    },
  },
  checks: [
    { run: "lint:slots", passes: "exactly one primary button on 1 detail page" },
    { run: "check:one-thing", passes: "one job per page on 2 pages" },
  ],
};
