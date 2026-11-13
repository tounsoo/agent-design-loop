/** Illegal: shells.chrome names the detail shell's slot "Heding". DetailPage has no such slot, so its Heading would be read as body. */
export default {
  config: {
    shells: {
      primarySlots: { detail: "Primary" },
      collections: { collection: ["Heading", "Description"] },
      chrome: { detail: ["Heding"] },
    },
  },
  checks: [
    { run: "check:inventories", fails: 'shells.chrome names slot "Heding" for page type "detail", but DetailPage has no such slot' },
  ],
};
