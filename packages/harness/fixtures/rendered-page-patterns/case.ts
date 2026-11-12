/** Legal: record names one step below the title inside a list, a disclosure the state opens and declares expanded, a menu whose summary is hidden, an action row pinned under a long page, visually hidden text, a turned-off button's faint text, and text over a gradient, which is skipped and counted. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/rendered-page-patterns",
    },
    flows: [
      {
        states: "packages/harness/fixtures/rendered-page-patterns/states.ts",
        views: "packages/harness/fixtures/rendered-page-patterns/index.html",
      },
    ],
  },
  checks: [
    { run: "check:rendered-page", passes: 'disclosures load closed (1 opened by their state)' },
    { run: "check:rendered-page", passes: "(1 over an image, not measured)" },
  ],
};
