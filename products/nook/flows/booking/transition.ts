import { roomById, type FlowEvent, type FlowState } from "./states";

/** Nook's one reducer. Both tasks run through it, and check:step-budget measures it. */
export function transition(state: FlowState, event: FlowEvent): FlowState {
  switch (event.type) {
    case "loaded":
      return state.status === "loading" ? (event.rooms.length === 0 ? { status: "no-rooms" } : { status: "choosing", page: "rooms" }) : state;
    case "failed":
      return state.status === "loading" ? { status: "error", message: event.message } : state;
    case "retry":
      return state.status === "error" ? { status: "loading" } : state;
    case "choose-room":
      if (state.status !== "choosing" || state.page !== "rooms" || !roomById(event.roomId)) return state;
      return { status: "choosing", page: "booking", roomId: event.roomId, duration: "60", detailsOpen: false };
    case "back":
      return state.status === "choosing" && state.page === "booking" ? { status: "choosing", page: "rooms" } : state;
    case "set-duration":
      return state.status === "choosing" && state.page === "booking" ? { ...state, duration: event.duration } : state;
    case "open-details":
    case "close-details":
      return state.status === "choosing" && state.page === "booking" ? { ...state, detailsOpen: event.type === "open-details" } : state;
    case "book":
      return state.status === "choosing" && state.page === "booking" ? { status: "booked", roomId: state.roomId, duration: state.duration } : state;
    case "hold":
      return state.status === "choosing" && state.page === "booking" ? { status: "held", roomId: state.roomId } : state;
  }
}
