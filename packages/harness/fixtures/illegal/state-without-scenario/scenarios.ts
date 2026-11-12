import type { Scenarios } from "../../../src/lib/scenario-read";

/** The fixture product's scenarios without changes-requested. */
export const scenarios = {
  loading: { state: "loading" },
  empty: { state: "empty" },
  error: { state: "error" },
  queue: { state: "ready" },
  "invoice-approved": { state: "invoice-approved" },
} satisfies Scenarios;
