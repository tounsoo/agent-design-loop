import { fullRooms, isModeledState, loadErrorMessage, sampleRooms, type FlowState } from "../flows/booking/states";

/**
 * `?state=<modeled state>` and, for choosing, `?page=rooms` or `?page=booking`,
 * with `&room=<id>` for another room's booking page.
 * check:target-size opens every modeled state this way. Unknown values show
 * the live app. The Waitlist previews wait for no room, for Cedar, and for
 * Birch once Cedar has freed up.
 */
export function readPreview(search: string): FlowState | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const state = params.get("state");
  if (state === null || !isModeledState(state)) return null;
  const roomId = sampleRooms[0]?.id ?? "";
  const [first, second] = fullRooms.map((room) => room.id);
  if (!first || !second) throw new Error("Nook's previews need two full rooms.");
  const waitingFor: readonly string[] = [];
  switch (state) {
    case "loading":
      return { status: "loading", waitingFor };
    case "no-rooms":
      return { status: "no-rooms", waitingFor };
    case "error":
      return { status: "error", message: loadErrorMessage, waitingFor };
    case "choosing":
      return params.get("page") === "booking"
        ? { status: "choosing", page: "booking", roomId: sampleRooms.find((room) => room.id === params.get("room"))?.id ?? roomId, duration: "60", detailsOpen: false, waitingFor }
        : { status: "choosing", page: "rooms", waitingFor };
    case "booked":
      return { status: "booked", roomId, duration: "60", waitingFor };
    case "held":
      return { status: "held", roomId, duration: "60", waitingFor };
    case "expired":
      return { status: "expired", roomId, duration: "60", waitingFor };
    case "waitlist":
      return { status: "waitlist", roomsFree: true, left: null, waitingFor };
    case "waiting":
      return { status: "waiting", roomsFree: true, waitingFor: [first] };
    case "freed":
      return { status: "freed", roomsFree: true, roomId: first, left: null, waitingFor: [second] };
  }
}
