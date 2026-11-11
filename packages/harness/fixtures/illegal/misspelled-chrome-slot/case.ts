/** Illegal: the config names the collection shell's chrome slot "Heding". CollectionPage has no such slot, so its Heading would be read as body. */
export default {
  config: {
    shells: {
      primarySlots: { detail: "Primary" },
      collections: { collection: ["Heding", "Description"] },
    },
  },
  checks: [
    { run: "check:one-thing", fails: 'names slot "Heding" for page type "collection", but CollectionPage has no such slot' },
    { run: "check:inventories", fails: 'names slot "Heding" for page type "collection", but CollectionPage has no such slot' },
  ],
};
