import {
  loadErrorMessage,
  samplePrefs,
  type ChannelId,
  type DeliveryWindowId,
  type FlowEvent,
  type FlowState,
  type ModeledState,
  type Prefs,
} from "./states";

function withChannel(prefs: Prefs, channel: ChannelId, checked: boolean): Prefs {
  return {
    ...prefs,
    channels: { ...prefs.channels, [channel]: checked },
  };
}

function withWindow(prefs: Prefs, window: DeliveryWindowId): Prefs {
  return { ...prefs, deliveryWindow: window };
}

/**
 * The flow is the source of truth. Events that are not legal in the current
 * state leave the state unchanged, so a confirm step is not representable.
 */
export function transition(state: FlowState, event: FlowEvent): FlowState {
  switch (state.status) {
    case "loading":
      if (event.type === "loaded") {
        return event.prefs
          ? { status: "ready", prefs: event.prefs, deliveryOpen: false }
          : { status: "empty" };
      }
      if (event.type === "failed") {
        return { status: "error", message: event.message };
      }
      return state;
    case "empty":
      if (event.type === "retry") return { status: "loading" };
      return state;
    case "error":
      if (event.type === "retry") return { status: "loading" };
      return state;
    case "ready":
      if (event.type === "set-channel") {
        return { ...state, prefs: withChannel(state.prefs, event.channel, event.checked) };
      }
      if (event.type === "open-delivery") return { ...state, deliveryOpen: true };
      if (event.type === "close-delivery") return { ...state, deliveryOpen: false };
      if (event.type === "set-window") {
        if (!state.deliveryOpen) return state;
        return { ...state, prefs: withWindow(state.prefs, event.window) };
      }
      if (event.type === "save") return { status: "prefs-saved", prefs: state.prefs };
      return state;
    case "prefs-saved":
      return state;
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}

export function initialFlowState(preview: ModeledState | null): FlowState {
  switch (preview) {
    case "loading":
      return { status: "loading" };
    case "empty":
      return { status: "empty" };
    case "error":
      return { status: "error", message: loadErrorMessage };
    case "prefs-saved":
      return { status: "prefs-saved", prefs: samplePrefs };
    case "ready":
    case null:
      return { status: "ready", prefs: samplePrefs, deliveryOpen: false };
    default: {
      const unreachable: never = preview;
      return unreachable;
    }
  }
}
