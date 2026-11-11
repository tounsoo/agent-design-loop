/** A base whose inputs export allowed_layouts from a `let` that is reassigned before the export, so its initializer is not the list the module exports. */
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

export const disclosed_sections = ["Line items"] as const;

export const allowed_page_types = ["collection", "detail"] as const;

let layouts = ["app-shell", "side-panel"];
layouts = ["app-shell"];

export { layouts as allowed_layouts };

export const allowed_content_layouts = ["data-table"] as const;
