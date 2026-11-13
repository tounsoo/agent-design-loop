/** Legal: the change adds the board page type with its own new entry under shells.collections, every entry the base had unchanged, and a proposal the change adds lists page-type:board under adds. A new page type with its own shells entry takes one pull request (proposal 2026-11-12-right-size-governance). */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/adds-a-page-type/inputs.ts",
      pageTypes: "packages/harness/fixtures/illegal/adds-a-page-type/page-types",
    },
    shells: {
      primarySlots: { detail: "Primary" },
      collections: { board: ["Heading", "Description"], collection: ["Heading", "Description"] },
      chrome: { detail: ["Heading"] },
    },
  },
  base: {},
  proposals: "packages/harness/fixtures/adds-a-page-type-with-its-shell/proposals",
  checks: [
    { run: "check:inventories", passes: "2026-11-12-board.md (only adds or tightens, so it is adopted in the pull request that adds it, which the code owner merges)" },
  ],
};
