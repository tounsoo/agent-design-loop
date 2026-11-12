import type { Scenarios } from "../../src/lib/scenario-read";

/** One scenario per modeled state, each named for its state. */
export const scenarios = {
  loading: { state: "loading" },
  ready: { state: "ready" },
  reminded: { state: "reminded" },
  archived: { state: "archived" },
} satisfies Scenarios;
