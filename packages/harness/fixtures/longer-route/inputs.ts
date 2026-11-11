/** Inputs for the longer-route fixture: the two-task inbox with archive-note's budget at 3. */
export const tasks = [
  { id: "send-reminder", description: "Send a reminder for an open note", success_state: "reminded", max_steps: 2 },
  { id: "archive-note", description: "Archive a finished note", success_state: "archived", max_steps: 3 },
] as const;

export const priority = [
  { action: "Send reminder", rank: 1, level: "primary" },
  { action: "Archive", rank: 2, level: "secondary" },
] as const;

export const disclosed_sections = [] as const;

export const allowed_page_types = ["collection", "detail"] as const;

export const allowed_layouts = ["app-shell"] as const;
