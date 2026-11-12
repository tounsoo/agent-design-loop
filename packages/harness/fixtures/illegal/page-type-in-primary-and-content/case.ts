/** Illegal: the config names detail as a primary-slot page and a content page, which ask for one primary action and none. */
export default {
  config: {
    shells: {
      primarySlots: { detail: "Primary" },
      collections: { collection: ["Heading", "Description"] },
      content: ["detail"],
    },
  },
  checks: [
    { run: "lint:slots", fails: 'page type "detail" in both primarySlots and content, but a content page has no primary action' },
    { run: "check:one-thing", fails: 'page type "detail" in both primarySlots and content' },
    { run: "check:inventories", fails: 'page type "detail" in both primarySlots and content' },
  ],
};
