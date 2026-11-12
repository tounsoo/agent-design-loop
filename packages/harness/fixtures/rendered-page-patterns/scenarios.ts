import type { Scenarios } from "../../src/lib/scenario-read";

/** One scenario per modeled state, each named for its state. */
export const scenarios = {
  ready: { state: "ready" },
} satisfies Scenarios;
