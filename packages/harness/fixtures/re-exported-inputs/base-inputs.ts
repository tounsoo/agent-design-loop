/** The fixture product's inputs as a base might write them: allowed_layouts, allowed_content_layouts and disclosed_sections declared, then exported in export clauses. */
export const tasks = [
  {
    id: "approve-vendor-invoice",
    description: "Review a vendor invoice and approve it",
    success_state: "invoice-approved",
    max_steps: 3,
  },
] as const;

export const priority = [
  { action: "Approve", rank: 1, level: "primary" },
  { action: "Request changes", rank: 2, level: "secondary" },
] as const;

const disclosed_sections = ["Line items"] as const;

export const allowed_page_types = ["collection", "detail"] as const;

const layouts = ["app-shell"] as const;

export { layouts as allowed_layouts };

const allowed_content_layouts = ["data-table", "line-items", "text-question"] as const;

export { allowed_content_layouts };

export { disclosed_sections };
