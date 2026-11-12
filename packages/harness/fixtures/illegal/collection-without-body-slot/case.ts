/** Illegal: the config names every slot of the collection's shell as chrome, so its pages have no body slot, which a new collection entry would not show until it had pages. */
export default {
  config: {
    shells: {
      primarySlots: { detail: "Primary" },
      collections: { collection: ["Heading", "Description", "Body"] },
    },
  },
  checks: [
    { run: "check:inventories", fails: "so its pages have no body slot" },
  ],
};
