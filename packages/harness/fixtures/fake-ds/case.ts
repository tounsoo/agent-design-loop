/** Legal under the stand-in adapter, which shares no name with Todae, with its own inputs and content layouts written in it. Run on the Todae adapter, every check here but the off-catalog lint fails these pages, so passing shows a check reads its names from the adapter. */
export default {
  config: {
    adapter: "packages/harness/fixtures/fake-ds/adapter.ts",
    paths: {
      source: "packages/harness/fixtures/fake-ds",
      catalog: "packages/harness/fixtures/fake-ds/catalog/index.ts",
      contentLayouts: "packages/harness/fixtures/fake-ds/content-layouts",
      features: "packages/harness/fixtures/fake-ds/features",
      inputs: "packages/harness/fixtures/fake-ds/inputs.ts",
    },
  },
  checks: [
    { run: "lint:slots", passes: "exactly one primary button on 1 detail page" },
    { run: "check:priority", passes: '"Approve" is the primary button' },
    { run: "check:disclosure", passes: "across 2 pages" },
    { run: "check:one-thing", passes: "one job per page" },
    { run: "check:inventories", passes: "page bodies use registered content layouts" },
    { run: "lint:product-ui", passes: "off-catalog: clean" },
  ],
};
