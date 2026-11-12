/** Legal: a third kind of page, help, which the config names under shells.content. It shows information and holds no primary action, so it is neither a primary-slot page nor a collection. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/content-page/features",
      inputs: "packages/harness/fixtures/content-page/inputs.ts",
      pageTypes: "packages/harness/fixtures/content-page/page-types",
    },
    shells: {
      primarySlots: { detail: "Primary" },
      collections: { collection: ["Heading", "Description"] },
      content: ["help"],
    },
  },
  checks: [
    { run: "lint:slots", passes: "exactly one primary button on 1 detail page" },
    { run: "check:one-thing", passes: "one job per page on 3 pages" },
    { run: "check:inventories", passes: "membership matches" },
  ],
};
