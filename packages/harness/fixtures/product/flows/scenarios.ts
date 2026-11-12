import type { Scenario, Scenarios } from "@agent-design-loop/harness/scenarios";
import type { ModeledState } from "./states";

/**
 * Each case the fixture product renders, which the checks that open the app
 * and the screenshots open at `?scenario=<id>`: a modeled state, and for
 * ready, which page shows it. Every modeled state needs at least one.
 */
export type FixtureScenario = Scenario<ModeledState> & { readonly page?: "collection" | "detail" };

export const scenarios = {
  loading: { state: "loading" },
  empty: { state: "empty" },
  error: { state: "error" },
  queue: { state: "ready", page: "collection" },
  "invoice-detail": { state: "ready", page: "detail" },
  "invoice-approved": { state: "invoice-approved" },
  "changes-requested": { state: "changes-requested" },
} satisfies Scenarios<ModeledState, FixtureScenario>;
