/** Legal: the change adds the board page type with its shells entry, and adopts a proposal decided on the base that lists board and shells.collections under changes. This is the second of the two pull requests a new page type takes. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/adds-a-page-type/inputs.ts",
      pageTypes: "packages/harness/fixtures/illegal/adds-a-page-type/page-types",
    },
    shells: {
      primarySlots: { detail: "Primary" },
      collections: { board: ["Heading", "Description"], collection: ["Heading", "Description"] },
    },
  },
  base: {},
  proposals: "packages/harness/fixtures/page-type-in-two-pull-requests/proposals",
  baseProposals: "packages/harness/fixtures/page-type-in-two-pull-requests/base-proposals",
  checks: [
    { run: "check:inventories", passes: "Adopts packages/harness/fixtures/page-type-in-two-pull-requests/proposals/2026-11-12-board.md" },
  ],
};
