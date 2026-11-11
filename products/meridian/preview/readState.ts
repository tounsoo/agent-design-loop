import { isCollectionRoute, type AppLocation, type CollectionRoute } from "../flows/invoice-approval/location";
import { isModeledState, isScreen, type ModeledState, type Screen } from "../flows/invoice-approval/states";
import type { Preview } from "../flows/invoice-approval/transition";

/** `?state=` and optional `?page=` preview. Unknown values fall through to the queue. */
export function readPreview(search: string): Preview {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const stateValue = params.get("state");
  const pageValue = params.get("page");
  const state: ModeledState | null = stateValue != null && isModeledState(stateValue) ? stateValue : null;
  const page: Screen | null = pageValue != null && isScreen(pageValue) ? pageValue : null;
  return { state, page, branch: params.get("branch") === "request" };
}

/** Product route plus the preview override. Unknown routes fall through to To approve. */
export function readLocation(search: string): AppLocation {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const routeValue = params.get("route");
  const route: CollectionRoute = routeValue != null && isCollectionRoute(routeValue) ? routeValue : "to-approve";
  const invoice = params.get("invoice");
  return {
    preview: readPreview(search),
    route,
    invoiceId: invoice && invoice.length > 0 ? invoice : null,
  };
}
