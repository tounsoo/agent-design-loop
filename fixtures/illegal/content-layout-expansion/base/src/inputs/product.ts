/** Baseline inventory. allowed_content_layouts is already recorded, so this is not a bootstrap. */
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

export const allowed_page_types = ["collection", "detail"] as const;

export const allowed_layouts = ["app-shell"] as const;

export const allowed_content_layouts = ["data-table"] as const;
