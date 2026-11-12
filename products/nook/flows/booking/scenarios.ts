import type { Scenario, Scenarios } from "@agent-design-loop/harness/scenarios";
import type { ModeledState, Page } from "./states";

/**
 * One case the booking flow renders, which the Chrome checks and the
 * screenshots open at `?scenario=<id>`: a modeled state, which page choosing
 * shows, and which room, by id, a booking, hold or wait is for. Without a
 * room, it is the first sample room, Harbor.
 */
export type BookingScenario = Scenario<ModeledState> & {
  readonly page?: Page;
  readonly room?: string;
};

export const scenarios = {
  loading: { state: "loading" },
  "no-rooms": { state: "no-rooms" },
  error: { state: "error" },
  rooms: { state: "choosing", page: "rooms" },
  "booking-harbor": { state: "choosing", page: "booking", room: "harbor" },
  "booking-lantern": { state: "choosing", page: "booking", room: "lantern" },
  "booking-quarry": { state: "choosing", page: "booking", room: "quarry" },
  booked: { state: "booked" },
  held: { state: "held" },
  expired: { state: "expired" },
  waitlist: { state: "waitlist" },
  waiting: { state: "waiting" },
  freed: { state: "freed" },
} satisfies Scenarios<ModeledState, BookingScenario>;
