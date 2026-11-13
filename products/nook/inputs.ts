import type { ModeledState } from "./flows/booking/states";

/** Nook's product inputs: two tasks on one flow, Book room before Hold room, and Room details behind a disclosure. */
export const tasks = [
  {
    id: "book-room",
    description: "Pick a free room and book it",
    success_state: "booked",
    max_steps: 3,
  },
  {
    id: "hold-room",
    description: "Pick a free room and hold it while you decide",
    success_state: "held",
    max_steps: 2,
  },
] as const satisfies readonly {
  readonly id: string;
  readonly description: string;
  readonly success_state: ModeledState;
  readonly max_steps: number;
}[];

export const priority = [
  { action: "Book room", rank: 1, level: "primary" },
  { action: "Hold room", rank: 2, level: "secondary" },
] as const satisfies readonly {
  readonly action: string;
  readonly rank: number;
  readonly level: "primary" | "secondary";
}[];

/** Sections behind a disclosure, by the disclosure's summary text. */
export const disclosed_sections = ["Room details"] as const;

export const allowed_page_types = ["booking", "rooms"] as const;

/** Chrome around the page. */
export const allowed_layouts = ["top-bar"] as const;

/** Compositions that fill a page type's body. */
export const allowed_content_layouts = ["room-cards", "room-details", "room-rows", "select-question"] as const;
