/** Illegal: shells.chrome names a page type the product does not allow, so the entry names chrome for no page. */
export default {
  config: {
    shells: {
      primarySlots: { detail: "Primary" },
      collections: { collection: ["Heading", "Description"] },
      chrome: { detail: ["Heading"], help: ["Heading"] },
    },
  },
  checks: [
    { run: "check:inventories", fails: 'shells.chrome names page type "help", which is not in allowed_page_types' },
  ],
};
