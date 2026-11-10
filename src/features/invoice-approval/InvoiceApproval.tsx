import { useState } from "react";
import { initialFlowState, transition, type Preview } from "../../flows/invoice-approval";
import { renderInvoiceApproval, type Actions } from "./views";

export function InvoiceApproval({ preview }: { preview: Preview }) {
  const [flow, setFlow] = useState(() => initialFlowState(preview));

  const actions: Actions = {
    retry: () => setFlow((current) => transition(current, { type: "retry" })),
    openInvoice: (invoiceId) => setFlow((current) => transition(current, { type: "open-invoice", invoiceId })),
    setLineItemsOpen: (open) =>
      setFlow((current) => transition(current, { type: open ? "open-line-items" : "close-line-items" })),
    requestChanges: () =>
      setFlow((current) => {
        if (current.status === "ready" && current.screen === "detail" && current.requestingChanges) {
          return transition(current, { type: "submit-request" });
        }
        return transition(current, { type: "start-request" });
      }),
    setReason: (reason) => setFlow((current) => transition(current, { type: "set-reason", reason })),
    approve: () => setFlow((current) => transition(current, { type: "approve" })),
  };

  return renderInvoiceApproval(flow, actions);
}
