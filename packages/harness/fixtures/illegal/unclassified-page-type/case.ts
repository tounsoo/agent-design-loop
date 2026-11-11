/** Illegal: the config names no collection, though the product has a collection page type, so the collection rules would read none of its pages. */
export default {
  config: {
    shells: {
      primarySlots: { detail: "Primary" },
      collections: {},
    },
  },
  checks: [
    { run: "lint:slots", fails: 'page type "collection" in neither primarySlots nor collections' },
    { run: "check:one-thing", fails: 'page type "collection" in neither primarySlots nor collections' },
    { run: "check:inventories", fails: 'page type "collection" in neither primarySlots nor collections' },
  ],
};
