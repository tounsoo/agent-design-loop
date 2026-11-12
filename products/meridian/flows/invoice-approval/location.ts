import type { Preview } from "./transition";
import { initialFlowState } from "./transition";
import type { FlowState, Invoice, ModeledState } from "./states";

/** Routes inside the collection page. Not a third page type. */
export const collectionRoutes = ["to-approve", "invoices", "vendors"] as const;

export type CollectionRoute = (typeof collectionRoutes)[number];

export type InvoiceRoute = Exclude<CollectionRoute, "vendors">;

/** A state only one route shows carries that route, so its bare preview opens the right page. */
export const routeOfState: Partial<Record<ModeledState, CollectionRoute>> = { "vendor-added": "vendors" };

export type AppLocation = {
  readonly preview: Preview;
  readonly route: CollectionRoute;
  readonly invoiceId: string | null;
};

export function isCollectionRoute(value: string): value is CollectionRoute {
  return (collectionRoutes as readonly string[]).includes(value);
}

export function locationKey(location: AppLocation): string {
  return JSON.stringify({
    state: location.preview.state,
    page: location.preview.page,
    branch: location.preview.branch,
    route: location.route,
    invoiceId: location.invoiceId,
  });
}

export function routeHref(route: CollectionRoute): string {
  if (route === "to-approve") return "/";
  return `?route=${route}`;
}

export function invoiceHref(route: CollectionRoute, invoiceId: string): string {
  const params = new URLSearchParams();
  if (route !== "to-approve") params.set("route", route);
  params.set("invoice", invoiceId);
  return `?${params.toString()}`;
}

function detailReady(invoiceId: string): Extract<FlowState, { status: "ready"; screen: "detail" }> {
  return {
    status: "ready",
    screen: "detail",
    invoiceId,
    lineItemsOpen: false,
    requestingChanges: false,
    reason: "",
    reasonError: false,
  };
}

/**
 * URL and preview override decide the screen. Ledger status decides what an
 * opened invoice shows, unless `?state=` forces a modeled view.
 */
export function flowFromLocation(location: AppLocation, ledger: readonly Invoice[]): FlowState {
  const { preview, invoiceId } = location;
  if (
    preview.state === "loading" ||
    preview.state === "empty" ||
    preview.state === "error" ||
    preview.state === "invoice-approved" ||
    preview.state === "changes-requested" ||
    preview.state === "vendor-added" ||
    (preview.state === "ready" && preview.page === "detail") ||
    (preview.state === "ready" && preview.page === "collection")
  ) {
    return initialFlowState(preview, invoiceId);
  }
  if (invoiceId) {
    const invoice = ledger.find((item) => item.id === invoiceId);
    if (!invoice) return { status: "ready", screen: "collection" };
    if (invoice.status === "approved") return { status: "invoice-approved", invoiceId: invoice.id };
    if (invoice.status === "changes-requested") {
      return {
        status: "changes-requested",
        invoiceId: invoice.id,
        reason: invoice.changeReason ?? "",
      };
    }
    return detailReady(invoice.id);
  }
  return { status: "ready", screen: "collection" };
}
