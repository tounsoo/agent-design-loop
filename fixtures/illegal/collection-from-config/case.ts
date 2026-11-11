/** Illegal: the config names detail as a collection too, so its primary action and its open body now break the collection rules. */
export default {
  config: {
    shells: {
      primarySlots: { detail: "Primary" },
      collections: { collection: ["Heading", "Description"], detail: ["Heading"] },
    },
  },
  checks: [
    { run: "check:one-thing", fails: "puts a primary button on the collection page" },
    { run: "check:inventories", fails: "Disclosure.Root in fixtures/product/features/Detail.tsx is not a registered content layout" },
  ],
};
