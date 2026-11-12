import { isModeledState, loadErrorMessage, sampleRooms, type FlowState } from "../flows/booking/states";

/**
 * `?state=<modeled state>` and, for choosing, `?page=rooms` or `?page=booking`.
 * check:target-size opens every modeled state this way. Unknown values show
 * the live app.
 */
export function readPreview(search: string): FlowState | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const state = params.get("state");
  if (state === null || !isModeledState(state)) return null;
  const roomId = sampleRooms[0]?.id ?? "";
  switch (state) {
    case "loading":
      return { status: "loading" };
    case "no-rooms":
      return { status: "no-rooms" };
    case "error":
      return { status: "error", message: loadErrorMessage };
    case "choosing":
      return params.get("page") === "booking"
        ? { status: "choosing", page: "booking", roomId, duration: "60", detailsOpen: false }
        : { status: "choosing", page: "rooms" };
    case "booked":
      return { status: "booked", roomId, duration: "60" };
    case "held":
      return { status: "held", roomId, duration: "60" };
    case "expired":
      return { status: "expired", roomId, duration: "60" };
  }
}
