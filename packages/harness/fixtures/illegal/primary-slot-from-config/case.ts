/** Illegal: the config names the detail shell's Secondary slot as its primary slot, so lint:slots reads that slot and finds no primary action in it. */
export default {
  config: {
    shells: {
      primarySlots: { detail: "Secondary" },
      collections: { collection: ["Heading", "Description"] },
    },
  },
  checks: [
    { run: "lint:slots", fails: "accepts exactly one primary button, found 0 primary and 1 Button.Root" },
  ],
};
