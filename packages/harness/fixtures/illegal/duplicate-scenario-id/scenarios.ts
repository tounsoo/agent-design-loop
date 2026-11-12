import type { Scenarios } from "../../../src/lib/scenario-read";

/** A second flow's scenarios, which reuse the id "queue" the fixture product's flow already has. */
export const scenarios = {
  loading: { state: "loading" },
  empty: { state: "empty" },
  error: { state: "error" },
  queue: { state: "ready" },
  "second-approved": { state: "invoice-approved" },
  "second-changes": { state: "changes-requested" },
} satisfies Scenarios;
