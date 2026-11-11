import { sampleRooms, type FlowEvent, type FlowState } from "./states";

/** The shipped flow both task graphs are measured against. A task starts at the loaded room list. */
export { transition } from "./transition";

export const flowStart: FlowState = { status: "choosing", page: "rooms" };

const firstRoom = sampleRooms[0];
if (!firstRoom) throw new Error("Nook needs a sample room to measure the shipped flow.");

/**
 * Events a person can cause on the screens. loaded and failed come from the
 * system, not from the person, so they are not steps.
 */
const userEventList = [
  { type: "choose-room", roomId: firstRoom.id },
  { type: "back" },
  { type: "set-duration", duration: "90" },
  { type: "open-details" },
  { type: "close-details" },
  { type: "book" },
  { type: "hold" },
  { type: "retry" },
] as const satisfies readonly FlowEvent[];

/** Every FlowEvent a person can cause must be listed, or the shipped path is not fully measured. */
type SystemEventType = "loaded" | "failed";
type MissingUserEvent = Exclude<FlowEvent["type"], SystemEventType | (typeof userEventList)[number]["type"]>;
type UserEventsCovered = MissingUserEvent extends never ? true : never;
export const userEventsCovered: UserEventsCovered = true;

export const userEvents: readonly FlowEvent[] = userEventList;
