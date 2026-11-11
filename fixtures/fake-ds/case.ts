/** Legal under the stand-in adapter, which shares no name with Todae. Run on the Todae adapter, every check here but the off-catalog lint fails these pages, so passing shows a check reads its names from the adapter. */
export default {
  config: {
    adapter: "fixtures/fake-ds/adapter.ts",
    paths: {
      catalog: "fixtures/fake-ds/catalog/index.ts",
      features: "fixtures/fake-ds/features",
    },
  },
  checks: [
    { run: "lint:slots", passes: "exactly one primary button on 1 detail page" },
    { run: "check:priority", passes: '"Approve" is the primary button' },
    { run: "check:disclosure", passes: "across 2 pages" },
    { run: "check:one-thing", passes: "one job per page" },
    { run: "check:inventories", passes: "membership matches" },
    { run: "lint:product-ui", passes: "off-catalog: clean" },
  ],
};
