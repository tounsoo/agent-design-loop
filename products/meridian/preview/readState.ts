import { readScenario } from "@agent-design-loop/harness/scenarios";
import { isCollectionRoute, routeOfState, type AppLocation, type CollectionRoute } from "../flows/invoice-approval/location";
import { scenarios } from "../flows/invoice-approval/scenarios";
import type { Preview } from "../flows/invoice-approval/transition";

/** The scenario `?scenario=<id>` names, as the flow's first render. An unknown id or none falls through to the live queue. */
export function readPreview(search: string): Preview {
  const scenario = readScenario(search, scenarios);
  if (scenario === null) return { state: null, page: null, branch: false };
  return { state: scenario.state, page: "page" in scenario ? scenario.page : null, branch: "branch" in scenario && scenario.branch };
}

/**
 * The product's route, invoice and scenario. A scenario's own route wins,
 * then the route the only page that shows its state is on, then `?route=`.
 * Unknown routes fall through to To approve.
 */
export function readLocation(search: string): AppLocation {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const scenario = readScenario(search, scenarios);
  const preview = readPreview(search);
  const routeValue = params.get("route");
  const asked: CollectionRoute = routeValue != null && isCollectionRoute(routeValue) ? routeValue : "to-approve";
  const route = (scenario !== null && "route" in scenario ? scenario.route : undefined) ?? (preview.state ? routeOfState[preview.state] : undefined) ?? asked;
  const invoice = params.get("invoice");
  return {
    preview,
    route,
    invoiceId: invoice && invoice.length > 0 ? invoice : null,
  };
}
