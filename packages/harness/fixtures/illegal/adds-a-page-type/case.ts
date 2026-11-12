/** Illegal: the change adds the board page type with its shells entry, and a proposal the change adds lists board under adds by its bare name. A page type goes under adds as page-type:<id>, so the bare name covers nothing. */
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
    { run: "check:inventories", fails: 'a proposal this change adds must list "page-type:board" under adds' },
    { run: "check:inventories", fails: 'lists "board" under adds, but this change adds "page-type:board"' },
  ],
};
