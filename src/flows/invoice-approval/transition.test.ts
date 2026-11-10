import { describe, expect, it } from "vitest";
import type { FlowEvent } from "./states";
import { initialFlowState, transition } from "./transition";

type AssertNoNote = "write-approval-note" extends FlowEvent["type"] ? never : true;
const assertNoNote: AssertNoNote = true;

const preview = { state: null, page: null, branch: false } as const;

describe("invoice approval flow", () => {
  it("does not require an approval note", () => {
    expect(assertNoNote).toBe(true);
  });

  it("approves in three changes", () => {
    let state = initialFlowState(preview);
    expect(state).toEqual({ status: "ready", screen: "collection" });
    state = transition(state, { type: "open-invoice", invoiceId: "inv-1842" });
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
});
