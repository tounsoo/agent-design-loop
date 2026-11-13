import { describe, expect, it } from "vitest";
import type { FlowEvent } from "./states";
import { initialFlowState, transition } from "./transition";
import { addVendor, previewAddedVendor, previewAddedVendorId, sampleVendors } from "./vendors";

type AssertNoNote = "write-approval-note" extends FlowEvent["type"] ? never : true;
const assertNoNote: AssertNoNote = true;

const preview = { state: null, page: null, branch: false } as const;

describe("invoice approval flow", () => {
  it("does not require an approval note", () => {
    expect(assertNoNote).toBe(true);
  });

  it("approves in two changes", () => {
    let state = initialFlowState(preview);
    expect(state).toEqual({ status: "ready", screen: "collection" });
    state = transition(state, { type: "open-invoice", invoiceId: "inv-1842" });
    state = transition(state, { type: "approve" });
    expect(state).toEqual({ status: "invoice-approved", invoiceId: "inv-1842" });
  });

  it("still approves after the optional Line items open", () => {
    let state = transition(initialFlowState(preview), { type: "open-invoice", invoiceId: "inv-1842" });
    state = transition(state, { type: "open-line-items" });
    state = transition(state, { type: "approve" });
    expect(state).toEqual({ status: "invoice-approved", invoiceId: "inv-1842" });
  });

  it("requests changes only after a reason", () => {
    let state = transition(initialFlowState(preview), { type: "open-invoice", invoiceId: "inv-1907" });
    state = transition(state, { type: "start-request" });
    state = transition(state, { type: "submit-request" });
    expect(state.status).toBe("ready");
    if (state.status !== "ready" || state.screen !== "detail") return;
    expect(state.reasonError).toBe(true);
    state = transition(state, { type: "set-reason", reason: "Bill of lading is missing." });
    state = transition(state, { type: "submit-request" });
    expect(state).toEqual({
      status: "changes-requested",
      invoiceId: "inv-1907",
      reason: "Bill of lading is missing.",
    });
  });

  it("ignores approve from the queue and from an error", () => {
    const queue = initialFlowState({ state: "ready", page: "collection", branch: false });
    expect(transition(queue, { type: "approve" })).toEqual(queue);
    const error = initialFlowState({ state: "error", page: null, branch: false });
    expect(transition(error, { type: "approve" })).toEqual(error);
    expect(transition(error, { type: "retry" }).status).toBe("loading");
  });

  it("maps an empty load", () => {
    const loading = initialFlowState({ state: "loading", page: null, branch: false });
    expect(transition(loading, { type: "loaded", invoices: [] }).status).toBe("empty");
  });

  it("moves the vendor list to vendor-added, and keeps it there for the next add", () => {
    const list = initialFlowState(preview);
    const added = transition(list, { type: "add-vendor", vendorId: previewAddedVendorId });
    expect(added).toEqual({ status: "vendor-added", vendorId: previewAddedVendorId });
    const { id } = addVendor(addVendor(sampleVendors, previewAddedVendor).registry, { ...previewAddedVendor, name: "Quarry Lane Movers" });
    expect(transition(added, { type: "add-vendor", vendorId: id })).toEqual({ status: "vendor-added", vendorId: id });
    expect(transition(added, { type: "open-invoice", invoiceId: "inv-1842" })).toBe(added);
    expect(transition(added, { type: "approve" })).toBe(added);
  });

  it("moves an empty list to vendor-added on the first add", () => {
    const empty = initialFlowState({ state: "empty", page: null, branch: false });
    expect(transition(empty, { type: "add-vendor", vendorId: previewAddedVendorId })).toEqual({
      status: "vendor-added",
      vendorId: previewAddedVendorId,
    });
  });

  it("ignores an add on an opened invoice", () => {
    const detail = initialFlowState({ state: "ready", page: "detail", branch: false });
    expect(transition(detail, { type: "add-vendor", vendorId: previewAddedVendorId })).toBe(detail);
  });

  it("previews vendor-added with the preview's vendor", () => {
    expect(initialFlowState({ state: "vendor-added", page: null, branch: false })).toEqual({
      status: "vendor-added",
      vendorId: previewAddedVendorId,
    });
  });

  it("keeps a vendor's page as it is: it has no event of its own", () => {
    const vendor = { status: "ready", screen: "vendor", vendorId: "helios-freight" } as const;
    expect(transition(vendor, { type: "approve" })).toBe(vendor);
    expect(transition(vendor, { type: "open-line-items" })).toBe(vendor);
    expect(initialFlowState({ state: "ready", page: "vendor", branch: false }, null)).toEqual({ status: "ready", screen: "vendor", vendorId: "" });
  });
});
