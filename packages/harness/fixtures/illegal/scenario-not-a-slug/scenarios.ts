import type { Scenarios } from "../../../src/lib/scenario-read";

/** The fixture product's scenarios, one of them named with capitals and an underscore. */
export const scenarios = {
  loading: { state: "loading" },
  empty: { state: "empty" },
  error: { state: "error" },
  Invoice_Queue: { state: "ready" },
  "invoice-approved": { state: "invoice-approved" },
  "changes-requested": { state: "changes-requested" },
} satisfies Scenarios;
