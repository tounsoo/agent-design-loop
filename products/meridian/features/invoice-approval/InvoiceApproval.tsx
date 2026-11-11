import { useState } from "react";
import {
  flowFromLocation,
  locationKey,
  sampleInvoices,
  transition,
  type AppLocation,
  type FlowState,
  type Invoice,
} from "../../flows/invoice-approval";
import { InvoiceApprovalView, type Actions } from "./views";

export function InvoiceApproval({
  location,
  onNavigate,
}: {
  location: AppLocation;
  onNavigate: (href: string) => void;
}) {
  const [ledger, setLedger] = useState<Invoice[]>(() => sampleInvoices.map((invoice) => ({ ...invoice })));
  const key = locationKey(location);
  const [seen, setSeen] = useState(key);
  const [overlay, setOverlay] = useState<FlowState | null>(null);
  if (seen !== key) {
    setSeen(key);
    setOverlay(null);
  }
  const flow = overlay ?? flowFromLocation(location, ledger);

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
  };

  return (
    <InvoiceApprovalView
      actions={actions}
      ledger={ledger}
      route={location.route}
      state={flow}
      onNavigate={onNavigate}
    />
  );
}
