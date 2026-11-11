/** Illegal: the config names detail as a primary-slot page and a collection, which ask for one primary action and none. */
export default {
  config: {
    shells: {
      primarySlots: { detail: "Primary" },
      collections: { collection: ["Heading", "Description"], detail: ["Heading"] },
    },
  },
  checks: [
    { run: "lint:slots", fails: 'page type "detail" in both primarySlots and collections' },
    { run: "check:one-thing", fails: 'page type "detail" in both primarySlots and collections' },
    { run: "check:inventories", fails: 'page type "detail" in both primarySlots and collections' },
  ],
};
