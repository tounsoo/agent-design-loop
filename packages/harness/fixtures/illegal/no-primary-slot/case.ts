/** Illegal: no page type has a primary slot, so lint:slots would check nothing. */
export default {
  config: {
    shells: {
      primarySlots: {},
      collections: { collection: ["Heading", "Description"] },
    },
  },
  checks: [
    { run: "lint:slots", fails: "shells.primarySlots names no page type, so no primary slot is checked" },
  ],
};
