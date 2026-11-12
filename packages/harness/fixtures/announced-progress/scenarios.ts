import type { Scenarios } from "../../src/lib/scenario-read";

/** One scenario per modeled state, each named for its state. */
export const scenarios = {
  ready: { state: "ready" },
  "invoice-approved": { state: "invoice-approved" },
  "changes-requested": { state: "changes-requested" },
} satisfies Scenarios;
