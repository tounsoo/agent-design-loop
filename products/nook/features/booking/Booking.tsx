import { useEffect, useReducer } from "react";
import { loadErrorMessage, sampleRooms, type FlowState } from "../../flows/booking/states";
import { transition } from "../../flows/booking/transition";
import { BookingView, type Actions } from "./views";

/**
 * Nook's one feature. A preview state from the URL is shown as it is. With
 * none, the room list loads, and `?fail` shows the load error instead.
 */
export function Booking({ initial, fail }: { initial: FlowState | null; fail: boolean }) {
  const [state, dispatch] = useReducer(transition, initial ?? { status: "loading" });
  const previewing = initial !== null;

  useEffect(() => {
    if (previewing || state.status !== "loading") return;
    const timer = window.setTimeout(() => {
      dispatch(fail ? { type: "failed", message: loadErrorMessage } : { type: "loaded", rooms: sampleRooms });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [fail, previewing, state.status]);

  const actions: Actions = {
    retry: () => dispatch({ type: "retry" }),
    chooseRoom: (roomId) => dispatch({ type: "choose-room", roomId }),
    back: () => dispatch({ type: "back" }),
    setDuration: (duration) => dispatch({ type: "set-duration", duration }),
    setDetailsOpen: (open) => dispatch({ type: open ? "open-details" : "close-details" }),
    book: () => dispatch({ type: "book" }),
    hold: () => dispatch({ type: "hold" }),
  };

  return <BookingView actions={actions} state={state} />;
}
