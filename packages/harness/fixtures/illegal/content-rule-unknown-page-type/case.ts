/** Illegal: shells.content names a page type the product does not allow, so the rule would read no page. */
export default {
  config: {
    shells: {
      primarySlots: { detail: "Primary" },
      collections: { collection: ["Heading", "Description"] },
      content: ["help"],
    },
  },
  checks: [
    { run: "check:one-thing", fails: 'shells.content names page type "help", which is not in allowed_page_types' },
  ],
};
