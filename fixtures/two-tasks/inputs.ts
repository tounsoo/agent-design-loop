/** Inputs for the two-task fixture product. Only tasks matter to the checks that run it. */
export const tasks = [
  { id: "send-reminder", description: "Send a reminder for an open note", success_state: "reminded", max_steps: 2 },
  { id: "archive-note", description: "Archive a finished note", success_state: "archived", max_steps: 2 },
] as const;

export const priority = [
  { action: "Send reminder", rank: 1, level: "primary" },
  { action: "Archive", rank: 2, level: "secondary" },
] as const;

export const disclosed_sections = [] as const;

export const allowed_page_types = ["collection", "detail"] as const;

export const allowed_layouts = ["app-shell"] as const;
