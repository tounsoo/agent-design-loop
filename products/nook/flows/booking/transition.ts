import { isFreeRoom, isFullRoom, roomById, type FlowEvent, type FlowState } from "./states";

/** Nook's one reducer. Both tasks run through it, and check:step-budget measures it. */
export function transition(state: FlowState, event: FlowEvent): FlowState {
  const { waitingFor } = state;
  const onWaitlist = state.status === "waitlist" || state.status === "waiting" || state.status === "freed";
  switch (event.type) {
    case "loaded":
      return state.status === "loading" ? (event.rooms.length === 0 ? { status: "no-rooms", waitingFor } : { status: "choosing", page: "rooms", waitingFor }) : state;
    case "failed":
      return state.status === "loading" ? { status: "error", message: event.message, waitingFor } : state;
    case "retry":
      return state.status === "error" ? { status: "loading", waitingFor } : state;
    case "choose-room":
      if (state.status === "freed" && state.roomId === event.roomId) {
        return { status: "choosing", page: "booking", roomId: event.roomId, duration: "60", detailsOpen: false, waitingFor };
      }
      if (state.status !== "choosing" || state.page !== "rooms" || !isFreeRoom(event.roomId)) return state;
      return { status: "choosing", page: "booking", roomId: event.roomId, duration: "60", detailsOpen: false, waitingFor };
    case "back":
      return (state.status === "choosing" && state.page === "booking") || state.status === "expired" ? { status: "choosing", page: "rooms", waitingFor } : state;
    case "set-duration":
      return state.status === "choosing" && state.page === "booking" ? { ...state, duration: event.duration } : state;
    case "open-details":
    case "close-details":
      return state.status === "choosing" && state.page === "booking" ? { ...state, detailsOpen: event.type === "open-details" } : state;
    case "book":
      // A held room can still be booked: the hold is how a person decides. So can one whose hold just ended.
      return (state.status === "choosing" && state.page === "booking") || state.status === "held" || state.status === "expired"
        ? { status: "booked", roomId: state.roomId, duration: state.duration, waitingFor }
        : state;
    case "hold":
      return state.status === "choosing" && state.page === "booking" ? { status: "held", roomId: state.roomId, duration: state.duration, waitingFor } : state;
    case "hold-ended":
      return state.status === "held" ? { status: "expired", roomId: state.roomId, duration: state.duration, waitingFor } : state;
    case "open-waitlist": {
      // The Waitlist page opens from wherever the person may leave: the Rooms page, a room they are choosing, or an ended hold.
      const roomsFree = state.status === "choosing" || state.status === "expired";
      if (!roomsFree && state.status !== "no-rooms") return state;
      return waitingFor.length > 0 ? { status: "waiting", roomsFree, waitingFor } : { status: "waitlist", roomsFree, left: null, waitingFor };
    }
    case "open-rooms":
      if (onWaitlist) return state.roomsFree ? { status: "choosing", page: "rooms", waitingFor } : { status: "no-rooms", waitingFor };
      return (state.status === "choosing" && state.page === "booking") || state.status === "expired" ? { status: "choosing", page: "rooms", waitingFor } : state;
    case "join-waitlist": {
      if (!onWaitlist || !isFullRoom(event.roomId) || waitingFor.includes(event.roomId)) return state;
      if (state.status === "freed" && state.roomId === event.roomId) return state;
      const joined = [...waitingFor, event.roomId];
      // A freed room stays offered while the person joins another.
      return state.status === "freed" ? { ...state, waitingFor: joined } : { status: "waiting", roomsFree: state.roomsFree, waitingFor: joined };
    }
    case "leave-waitlist": {
      if (!onWaitlist || !waitingFor.includes(event.roomId)) return state;
      const rest = waitingFor.filter((id) => id !== event.roomId);
      if (state.status === "freed") return { ...state, waitingFor: rest };
      return rest.length > 0 ? { status: "waiting", roomsFree: state.roomsFree, waitingFor: rest } : { status: "waitlist", roomsFree: state.roomsFree, left: event.roomId, waitingFor: rest };
    }
    case "room-freed":
      // Only on the Waitlist page: a room the person waits for frees up, and leaves the list they wait on.
      return state.status === "waiting" && waitingFor.includes(event.roomId) && roomById(event.roomId)
        ? { status: "freed", roomsFree: state.roomsFree, roomId: event.roomId, waitingFor: waitingFor.filter((id) => id !== event.roomId) }
        : state;
  }
}
