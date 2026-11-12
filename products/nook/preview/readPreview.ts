import { readScenario } from "@agent-design-loop/harness/scenarios";
import { scenarios } from "../flows/booking/scenarios";
import { fullRooms, loadErrorMessage, sampleRooms, type FlowState } from "../flows/booking/states";

/**
 * The flow's first state for the scenario `?scenario=<id>` names, from the
 * booking flow's scenarios.ts. An unknown id or none shows the live app. A
 * booking, hold or wait is for the scenario's room, or the first sample room.
 * The Waitlist scenarios wait for no room, for Cedar, and for Birch once
 * Cedar has freed up.
 */
export function readPreview(search: string): FlowState | null {
  const scenario = readScenario(search, scenarios);
  if (scenario === null) return null;
  const roomId = ("room" in scenario ? scenario.room : undefined) ?? sampleRooms[0]?.id ?? "";
  if (!sampleRooms.some((room) => room.id === roomId)) throw new Error(`Nook's scenario ${scenario.id} names room "${roomId}", which is not a sample room.`);
  const [first, second] = fullRooms.map((room) => room.id);
  if (!first || !second) throw new Error("Nook's scenarios need two full rooms.");
  const waitingFor: readonly string[] = [];
  switch (scenario.state) {
    case "loading":
      return { status: "loading", waitingFor };
    case "no-rooms":
      return { status: "no-rooms", waitingFor };
    case "error":
      return { status: "error", message: loadErrorMessage, waitingFor };
    case "choosing":
      return "page" in scenario && scenario.page === "booking"
        ? { status: "choosing", page: "booking", roomId, duration: "60", detailsOpen: false, waitingFor }
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
