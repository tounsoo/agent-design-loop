/** Illegal: shells.chrome names every slot of the detail shell but its primary slot, so its pages have no body slot and the body rule would read nothing. */
export default {
  config: {
    shells: {
      primarySlots: { detail: "Primary" },
      collections: { collection: ["Heading", "Description"] },
      chrome: { detail: ["Heading", "Body", "Secondary"] },
    },
  },
  checks: [
    { run: "check:inventories", fails: "so its pages have no body slot" },
  ],
};
