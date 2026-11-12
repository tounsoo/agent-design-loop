import { useEffect, useReducer } from "react";
import { FREE_UP_SECONDS, HOLD_MINUTES, loadErrorMessage, sampleRooms, type FlowState } from "../../flows/booking/states";
import { transition } from "../../flows/booking/transition";
import { BookingView, type Actions } from "./views";

/**
 * Nook's one feature. A preview state from the URL is shown as it is. With
 * none, the room list loads, and `?fail` shows the load error instead. A
 * hold ends by itself after HOLD_MINUTES, and on the Waitlist page the first
 * room a person waits for frees up after FREE_UP_SECONDS.
 */
export function Booking({ initial, fail }: { initial: FlowState | null; fail: boolean }) {
  const [state, dispatch] = useReducer(transition, initial ?? { status: "loading", waitingFor: [] });
  const previewing = initial !== null;

  useEffect(() => {
    if (previewing || state.status !== "loading") return;
    const timer = window.setTimeout(() => {
      dispatch(fail ? { type: "failed", message: loadErrorMessage } : { type: "loaded", rooms: sampleRooms });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [fail, previewing, state.status]);

  useEffect(() => {
    // A held preview stays as it is. A hold the person makes, even after a preview, ends.
    if (state.status !== "held" || state === initial) return;
    const timer = window.setTimeout(() => {
      dispatch({ type: "hold-ended" });
    }, HOLD_MINUTES * 60_000);
    return () => window.clearTimeout(timer);
  }, [initial, state]);

  // A waiting preview stays as it is. Waiting the person starts, even after a preview, frees a room.
  const freeing = state.status === "waiting" && state !== initial ? state.waitingFor[0] : undefined;
  useEffect(() => {
    if (freeing === undefined) return;
    const timer = window.setTimeout(() => {
      dispatch({ type: "room-freed", roomId: freeing });
    }, FREE_UP_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [freeing]);

  const actions: Actions = {
    retry: () => dispatch({ type: "retry" }),
    chooseRoom: (roomId) => dispatch({ type: "choose-room", roomId }),
    back: () => dispatch({ type: "back" }),
    setDuration: (duration) => dispatch({ type: "set-duration", duration }),
    setDetailsOpen: (open) => dispatch({ type: open ? "open-details" : "close-details" }),
    book: () => dispatch({ type: "book" }),
    hold: () => dispatch({ type: "hold" }),
    navigate: (place) => dispatch({ type: place === "waitlist" ? "open-waitlist" : "open-rooms" }),
    join: (roomId) => dispatch({ type: "join-waitlist", roomId }),
    leave: (roomId) => dispatch({ type: "leave-waitlist", roomId }),
  };

  return <BookingView actions={actions} state={state} />;
}
