import type { Scenarios } from "../../../src/lib/scenario-read";

/** The fixture product's scenarios, plus one for "confirming", which is not a modeled state. */
export const scenarios = {
  loading: { state: "loading" },
  empty: { state: "empty" },
  error: { state: "error" },
  queue: { state: "ready" },
  "invoice-approved": { state: "invoice-approved" },
  "changes-requested": { state: "changes-requested" },
  confirming: { state: "confirming" },
} satisfies Scenarios;
