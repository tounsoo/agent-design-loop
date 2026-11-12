/** Illegal: the change adds the board page type with its own shells entry, and also changes the chrome slots of the collection entry the base had, with a proposal the change adds that lists page-type:board under adds. Only a new page type's own entry rides along with it, so neither is covered: changing an entry the base had takes a proposal decided on the base. */
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
  base: {
    shells: {
      primarySlots: { detail: "Primary" },
      collections: { collection: ["Heading"] },
    },
  },
  proposals: "packages/harness/fixtures/adds-a-page-type-with-its-shell/proposals",
  checks: [
    { run: "check:inventories", fails: 'alters a shells entry the base had ("collection")' },
  ],
};
