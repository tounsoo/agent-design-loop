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
  /** The vendor page `?vendor=` or the scenario names, on the Vendors route. */
  readonly vendorId: string | null;
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
    vendorId: location.vendorId,
  });
}

export function routeHref(route: CollectionRoute): string {
  if (route === "to-approve") return "/";
  return `?route=${route}`;
}

export function invoiceHref(route: CollectionRoute, invoiceId: string, vendorId?: string): string {
  const params = new URLSearchParams();
  if (route !== "to-approve") params.set("route", route);
  // From a vendor's page, so its breadcrumb can lead back there.
  if (route === "vendors" && vendorId) params.set("vendor", vendorId);
  params.set("invoice", invoiceId);
  return `?${params.toString()}`;
}

/** A vendor's page sits on the Vendors route, so Vendors stays current in the navigation. */
export function vendorHref(vendorId: string): string {
  const params = new URLSearchParams({ route: "vendors", vendor: vendorId });
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
 * opened invoice shows, unless a `?scenario=` forces a modeled view.
 */
export function flowFromLocation(location: AppLocation, ledger: readonly Invoice[]): FlowState {
  const { preview, invoiceId, vendorId } = location;
  if (preview.state === "ready" && preview.page === "vendor") {
    return { status: "ready", screen: "vendor", vendorId: vendorId ?? "" };
  }
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
  if (vendorId && location.route === "vendors" && preview.state === null) return { status: "ready", screen: "vendor", vendorId };
  return { status: "ready", screen: "collection" };
}
