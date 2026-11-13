import type { ModeledState } from "../flows/invoice-approval/states";

export const tasks = [
  {
    id: "approve-vendor-invoice",
    description: "Review a vendor invoice and approve it",
    success_state: "invoice-approved",
    max_steps: 3,
  },
] as const satisfies readonly {
  readonly id: string;
  readonly description: string;
  readonly success_state: ModeledState;
  readonly max_steps: number;
}[];

export const priority = [
  { action: "Approve", rank: 1, level: "primary" },
  { action: "Request changes", rank: 2, level: "secondary" },
] as const satisfies readonly {
  readonly action: string;
  readonly rank: number;
  readonly level: "primary" | "secondary";
}[];

/**
 * Sections that sit behind a disclosure, by the disclosure's summary text.
 * check:priority requires each one to be a Disclosure.Summary in features/ or
 * in a content layout a page renders.
 */
export const disclosed_sections = ["Line items"] as const;

export const allowed_page_types = ["collection", "detail", "profile"] as const;

/** Chrome around the page. Not the composition inside a page body. */
export const allowed_layouts = ["app-shell"] as const;

/** Compositions that fill a page type's body. */
export const allowed_content_layouts = ["data-table", "directory", "facts", "invoice-list", "line-items", "progress", "text-question"] as const;

export type Task = (typeof tasks)[number];
export type PriorityItem = (typeof priority)[number];
export type DisclosedSection = (typeof disclosed_sections)[number];
export type AllowedPageType = (typeof allowed_page_types)[number];
export type AllowedLayout = (typeof allowed_layouts)[number];
export type AllowedContentLayout = (typeof allowed_content_layouts)[number];
