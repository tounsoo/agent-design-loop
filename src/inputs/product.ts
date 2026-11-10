import type { ModeledState } from "../flows/notification-prefs/states";

export const tasks = [
  {
    id: "update-notification-prefs",
    description: "Change notification preferences and save",
    success_state: "prefs-saved",
    max_steps: 4,
  },
] as const satisfies readonly {
  readonly id: string;
  readonly description: string;
  readonly success_state: ModeledState;
  readonly max_steps: number;
}[];

export const priority = [
  { action: "Save", rank: 1, level: "primary" },
  { action: "Delivery windows", rank: 2, level: "secondary" },
] as const satisfies readonly {
  readonly action: string;
  readonly rank: number;
  readonly level: "primary" | "secondary";
}[];

export const allowed_page_types = ["settings"] as const;

export type Task = (typeof tasks)[number];
export type PriorityItem = (typeof priority)[number];
export type AllowedPageType = (typeof allowed_page_types)[number];
