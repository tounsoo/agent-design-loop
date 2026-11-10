import { describe, expect, it } from "vitest";
import type { FlowEvent } from "./states";
import { initialFlowState, transition } from "./transition";

type AssertNoConfirm = "confirm" extends FlowEvent["type"] ? never : true;
const assertNoConfirm: AssertNoConfirm = true;

describe("notification preference flow", () => {
  it("keeps confirm unrepresentable", () => {
    expect(assertNoConfirm).toBe(true);
  });

  it("reaches prefs-saved in four changes", () => {
    let state = initialFlowState(null);
    expect(state.status).toBe("ready");
    state = transition(state, { type: "set-channel", channel: "push", checked: true });
    state = transition(state, { type: "open-delivery" });
    state = transition(state, { type: "set-window", window: "afternoon" });
    state = transition(state, { type: "save" });
    expect(state.status).toBe("prefs-saved");
    if (state.status !== "prefs-saved") return;
    expect(state.prefs.channels.push).toBe(true);
    expect(state.prefs.channels.email).toBe(true);
    expect(state.prefs.deliveryWindow).toBe("afternoon");
  });

  it("ignores a window change until delivery is open", () => {
    const ready = initialFlowState("ready");
    const next = transition(ready, { type: "set-window", window: "evening" });
    expect(next).toEqual(ready);
  });

  it("ignores save from the error state", () => {
    const error = initialFlowState("error");
    expect(transition(error, { type: "save" })).toEqual(error);
    expect(transition(error, { type: "retry" }).status).toBe("loading");
  });

  it("maps a failed load and an empty load", () => {
    const loading = initialFlowState("loading");
    expect(transition(loading, { type: "failed", message: "offline" })).toEqual({
      status: "error",
      message: "offline",
    });
    expect(transition(loading, { type: "loaded", prefs: null }).status).toBe("empty");
  });
});
