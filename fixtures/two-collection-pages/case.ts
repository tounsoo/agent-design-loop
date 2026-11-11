/** Legal: two collection pages in two files, and one detail page. */
export default {
  config: {
    paths: {
      features: "fixtures/two-collection-pages",
    },
  },
  checks: [
    { run: "check:one-thing", passes: "one job per page on 3 pages" },
  ],
};
