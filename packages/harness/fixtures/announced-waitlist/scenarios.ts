import type { Scenarios } from "../../src/lib/scenario-read";

/** One scenario per modeled state, each named for its state. */
export const scenarios = {
  waitlist: { state: "waitlist" },
  waiting: { state: "waiting" },
  freed: { state: "freed" },
} satisfies Scenarios;
