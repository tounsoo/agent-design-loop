/** Illegal: shells.chrome names the collection, which names its chrome in its shells.collections entry, so the two could disagree. */
export default {
  config: {
    shells: {
      primarySlots: { detail: "Primary" },
      collections: { collection: ["Heading", "Description"] },
      chrome: { collection: ["Heading"], detail: ["Heading"] },
    },
  },
  checks: [
    { run: "check:inventories", fails: 'shells.chrome names page type "collection", a collection, which names its chrome in shells.collections' },
  ],
};
