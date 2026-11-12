import {
  loadErrorMessage,
  sampleInvoices,
  type FlowEvent,
  type FlowState,
  type ModeledState,
  type Screen,
} from "./states";
import { previewAddedVendorId } from "./vendors";

function detailReady(
  invoiceId: string,
  extras?: Partial<Extract<FlowState, { status: "ready"; screen: "detail" }>>,
): Extract<FlowState, { status: "ready"; screen: "detail" }> {
  return {
    status: "ready",
    screen: "detail",
    invoiceId,
    lineItemsOpen: false,
    requestingChanges: false,
    reason: "",
    reasonError: false,
    ...extras,
  };
}

/**
 * The flow is the source of truth. Approve does not require a note.
 * Request changes is a branch: the reason field is hidden until that
 * action is chosen, and an empty reason cannot reach changes-requested.
 */
export function transition(state: FlowState, event: FlowEvent): FlowState {
  switch (state.status) {
    case "loading":
      if (event.type === "loaded") {
        return event.invoices.length === 0 ? { status: "empty" } : { status: "ready", screen: "collection" };
      }
      if (event.type === "failed") return { status: "error", message: event.message };
      return state;
    case "empty":
      if (event.type === "retry") return { status: "loading" };
      return state;
    case "error":
      if (event.type === "retry") return { status: "loading" };
      return state;
    case "ready":
      if (state.screen === "collection") {
        if (event.type === "open-invoice") return detailReady(event.invoiceId);
        if (event.type === "add-vendor") return { status: "vendor-added", vendorId: event.vendorId };
        return state;
      }
      if (event.type === "open-line-items") return { ...state, lineItemsOpen: true };
      if (event.type === "close-line-items") return { ...state, lineItemsOpen: false };
      if (event.type === "start-request") {
        return { ...state, requestingChanges: true, reasonError: false };
      }
      if (event.type === "set-reason") {
        return { ...state, reason: event.reason, reasonError: false };
      }
      if (event.type === "submit-request") {
        if (!state.requestingChanges) return state;
        if (state.reason.trim() === "") return { ...state, reasonError: true };
        return { status: "changes-requested", invoiceId: state.invoiceId, reason: state.reason.trim() };
      }
      if (event.type === "approve") return { status: "invoice-approved", invoiceId: state.invoiceId };
      return state;
    case "invoice-approved":
      return state;
    case "changes-requested":
      return state;
    case "vendor-added":
      if (event.type === "open-invoice") return detailReady(event.invoiceId);
      if (event.type === "add-vendor") return { status: "vendor-added", vendorId: event.vendorId };
      return state;
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}

export type Preview = {
  readonly state: ModeledState | null;
  readonly page: Screen | null;
  readonly branch: boolean;
};

const firstInvoice = sampleInvoices[0];

export function initialFlowState(preview: Preview, invoiceId?: string | null): FlowState {
  const id = invoiceId && invoiceId.length > 0 ? invoiceId : (firstInvoice?.id ?? "");
  switch (preview.state) {
    case "loading":
      return { status: "loading" };
    case "empty":
      return { status: "empty" };
    case "error":
      return { status: "error", message: loadErrorMessage };
    case "invoice-approved":
      return { status: "invoice-approved", invoiceId: id };
    case "changes-requested":
      return {
        status: "changes-requested",
        invoiceId: id,
        reason: "Quantity on toner does not match the packing slip.",
      };
    case "vendor-added":
      return { status: "vendor-added", vendorId: previewAddedVendorId };
    case "ready":
      if (preview.page === "detail") {
        return detailReady(id, { requestingChanges: preview.branch });
      }
      return { status: "ready", screen: "collection" };
    case null:
      return { status: "ready", screen: "collection" };
    default: {
      const unreachable: never = preview.state;
      return unreachable;
    }
  }
}
