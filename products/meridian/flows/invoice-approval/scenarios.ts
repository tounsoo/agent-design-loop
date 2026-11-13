import type { Scenario, Scenarios } from "@agent-design-loop/harness/scenarios";
import type { CollectionRoute } from "./location";
import type { ModeledState, Screen } from "./states";

/**
 * One case the invoice approval flow renders, which the Chrome checks and the
 * screenshots open at `?scenario=<id>`: a modeled state, which page shows it,
 * which collection route, whether the request-changes branch is open, and
 * which vendor a vendor page shows.
 */
export type InvoiceScenario = Scenario<ModeledState> & {
  readonly page?: Screen;
  readonly route?: CollectionRoute;
  readonly branch?: boolean;
  /** The vendor a vendor page shows, by id. */
  readonly vendor?: string;
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
  "vendor-helios-freight": { state: "ready", page: "vendor", route: "vendors", vendor: "helios-freight" },
  "vendor-harbor-and-pine": { state: "ready", page: "vendor", route: "vendors", vendor: "harbor-and-pine-catering" },
  "vendor-nothing-open": { state: "ready", page: "vendor", route: "vendors", vendor: "kite-analytics" },
  "vendor-no-invoices": { state: "ready", page: "vendor", route: "vendors", vendor: "okafor-and-lindqvist-commercial-facilities-maintenance-cooperative" },
  "vendor-unknown": { state: "ready", page: "vendor", route: "vendors", vendor: "no-such-vendor" },
} satisfies Scenarios<ModeledState, InvoiceScenario>;
