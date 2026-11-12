import type { Scenario, Scenarios } from "@agent-design-loop/harness/scenarios";
import type { CollectionRoute } from "./location";
import type { ModeledState, Screen } from "./states";

/**
 * One case the invoice approval flow renders, which the Chrome checks and the
 * screenshots open at `?scenario=<id>`: a modeled state, which page shows it,
 * which collection route, and whether the request-changes branch is open.
 */
export type InvoiceScenario = Scenario<ModeledState> & {
  readonly page?: Screen;
  readonly route?: CollectionRoute;
  readonly branch?: boolean;
};

export const scenarios = {
  loading: { state: "loading" },
  empty: { state: "empty" },
  error: { state: "error" },
  queue: { state: "ready", page: "collection" },
  invoices: { state: "ready", route: "invoices" },
  vendors: { state: "ready", route: "vendors" },
  "invoice-detail": { state: "ready", page: "detail" },
  "invoice-requesting-changes": { state: "ready", page: "detail", branch: true },
  "invoice-approved": { state: "invoice-approved", page: "detail" },
  "changes-requested": { state: "changes-requested", page: "detail" },
  "vendor-added": { state: "vendor-added" },
} satisfies Scenarios<ModeledState, InvoiceScenario>;
