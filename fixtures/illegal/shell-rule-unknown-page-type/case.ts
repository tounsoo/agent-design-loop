/** Illegal: the shells rules name page types the product does not allow, so a rule would have no shell to read. */
export default {
  config: {
    shells: {
      primarySlots: { detail: "Primary", form: "Submit" },
      collections: { collection: ["Heading", "Description"], wizard: ["Heading"] },
    },
  },
  checks: [
    { run: "lint:slots", fails: 'shells.primarySlots names page type "form", which is not in allowed_page_types' },
    { run: "check:one-thing", fails: 'shells.collections names page type "wizard", which is not in allowed_page_types' },
    { run: "check:inventories", fails: 'shells.collections names page type "wizard", which is not in allowed_page_types' },
  ],
};
