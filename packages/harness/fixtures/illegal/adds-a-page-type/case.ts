/** Illegal: the change adds the board page type with its shells entry, and a proposal the change adds lists board under adds. A page type also needs a shells entry, which is a config change, so it is never an addition: it takes a proposal decided on the base. */
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
  proposals: "packages/harness/fixtures/illegal/adds-a-page-type/proposals",
  checks: [
    { run: "check:inventories", fails: "A page type is never added in one pull request" },
  ],
};
