import { useState } from "react";
import {
  addVendor,
  flowFromLocation,
  locationKey,
  sampleInvoices,
  transition,
  knownVendors,
  previewVendors,
  type AppLocation,
  type FlowState,
  type Invoice,
  type Vendor,
} from "../../flows/invoice-approval";
import { InvoiceApprovalView, type Actions } from "./views";

export function InvoiceApproval({
  location,
  onNavigate,
  added: addedFromApp,
  onVendorAdded,
}: {
  location: AppLocation;
  onNavigate: (href: string) => void;
  /** The vendors added in this session, when the app holds them, so its page title can name an added vendor. */
  added?: readonly Vendor[];
  onVendorAdded?: (vendor: Vendor) => void;
}) {
  const [ledger, setLedger] = useState<Invoice[]>(() => sampleInvoices.map((invoice) => ({ ...invoice })));
  // Only the vendors added in this session. previewVendors decides which of them each preview shows.
  const [ownAdded, setOwnAdded] = useState<readonly Vendor[]>([]);
  const added = addedFromApp ?? ownAdded;
  const remember = onVendorAdded ?? ((vendor: Vendor) => setOwnAdded((vendors) => [...vendors, vendor]));
  const key = locationKey(location);
  const [seen, setSeen] = useState(key);
  const [overlay, setOverlay] = useState<FlowState | null>(null);
  if (seen !== key) {
    setSeen(key);
    setOverlay(null);
  }
  const shownVendors = previewVendors(location.preview.state, added);
  const located = flowFromLocation(location, ledger);
  // A link to a vendor Meridian does not have is the Vendors page, so adding a vendor there works as it does on Vendors.
  const unknownVendor = located.status === "ready" && located.screen === "vendor" && !shownVendors.some((vendor) => vendor.id === located.vendorId);
  const flow = overlay ?? (unknownVendor ? ({ status: "ready", screen: "collection" } as const) : located);
  // Empty means nothing loaded, so its vendor cards join no invoices.
  const shownLedger = location.preview.state === "empty" ? [] : ledger;

  const actions: Actions = {
    retry: () => setOverlay(transition(flow, { type: "retry" })),
    openInvoice: (invoiceId) => {
      const params = new URLSearchParams();
      if (location.route !== "to-approve") params.set("route", location.route);
      params.set("invoice", invoiceId);
      onNavigate(`?${params.toString()}`);
    },
    setLineItemsOpen: (open) =>
      setOverlay(transition(flow, { type: open ? "open-line-items" : "close-line-items" })),
    requestChanges: () => {
      if (flow.status === "ready" && flow.screen === "detail" && flow.requestingChanges) {
        const next = transition(flow, { type: "submit-request" });
        if (next.status === "changes-requested") {
          setLedger((rows) =>
            rows.map((row) =>
              row.id === next.invoiceId ? { ...row, status: "changes-requested", changeReason: next.reason } : row,
            ),
          );
        }
        setOverlay(next);
        return;
      }
      setOverlay(transition(flow, { type: "start-request" }));
    },
    setReason: (reason) => setOverlay(transition(flow, { type: "set-reason", reason })),
    approve: () => {
      if (flow.status !== "ready" || flow.screen !== "detail") return;
      const invoiceId = flow.invoiceId;
      setLedger((rows) => rows.map((row) => (row.id === invoiceId ? { ...row, status: "approved" } : row)));
      setOverlay(transition(flow, { type: "approve" }));
    },
    addVendor: (vendor) => {
      const { registry: next, id, added: isNew } = addVendor(shownVendors, vendor, knownVendors(added));
      const created = next.find((entry) => entry.id === id);
      if (isNew && created) remember(created);
      setOverlay(transition(flow, { type: "add-vendor", vendorId: id }));
    },
  };

  return (
    <InvoiceApprovalView
      actions={actions}
      ledger={shownLedger}
      registry={shownVendors}
      route={location.route}
      state={flow}
      vendorId={location.vendorId}
      onNavigate={onNavigate}
    />
  );
}
