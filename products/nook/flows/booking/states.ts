/** The states Nook models. Every one has a view, and check:target-size opens each one. */
export const modeledStates = ["loading", "no-rooms", "error", "choosing", "booked", "held", "expired", "waitlist", "waiting", "freed"] as const;

export type ModeledState = (typeof modeledStates)[number];

export type Page = "rooms" | "booking";

/** The two places the top bar goes. */
export type Place = "rooms" | "waitlist";

export const durations = ["30", "60", "90"] as const;

export type Duration = (typeof durations)[number];

export const durationLabel: Record<Duration, string> = {
  "30": "30 minutes",
  "60": "1 hour",
  "90": "1 hour 30 minutes",
};

/** A time the room is booked later today, as a person reads it. Only the times: never who booked it or what for. */
export type Booking = { readonly start: string; readonly end: string };

export type Room = {
  readonly id: string;
  readonly name: string;
  readonly floor: string;
  readonly seats: number;
  readonly equipment: readonly string[];
  /** What the room offers beyond its equipment, which Room details lists. */
  readonly amenities: readonly string[];
  /** Times the room is booked after the next hour and a half, earliest first. Fixed sample times: Nook has no clock. */
  readonly laterToday: readonly Booking[];
  /** People on the waitlist for those times. */
  readonly waitlistCount: number;
};

/** Each room's later bookings, waitlist count and amenities come with it in Nook's one load. */
export const sampleRooms: readonly Room[] = [
  {
    id: "harbor",
    name: "Harbor",
    floor: "Floor 2",
    seats: 4,
    equipment: ["Screen", "Whiteboard"],
    amenities: ["Natural light", "Step-free access"],
    laterToday: [
      { start: "1:00 PM", end: "2:00 PM" },
      { start: "3:30 PM", end: "4:30 PM" },
    ],
    waitlistCount: 2,
  },
  {
    id: "lantern",
    name: "Lantern",
    floor: "Floor 2",
    seats: 8,
    equipment: ["Screen", "Video bar", "Whiteboard"],
    amenities: ["Step-free access", "Quiet floor", "Near the kitchen", "Blackout blinds", "Daylight and a view of the harbor"],
    laterToday: [
      { start: "12:30 PM", end: "1:30 PM" },
      { start: "1:30 PM", end: "3:00 PM" },
      { start: "3:00 PM", end: "4:00 PM" },
      { start: "4:00 PM", end: "5:00 PM" },
      { start: "5:00 PM", end: "6:00 PM" },
    ],
    waitlistCount: 0,
  },
  { id: "quarry", name: "Quarry", floor: "Floor 3", seats: 2, equipment: ["Phone"], amenities: [], laterToday: [], waitlistCount: 0 },
];

/** Rooms booked for the next hour and a half, which a person can wait for. They come with the free rooms in Nook's one load. */
export const fullRooms: readonly Room[] = [
  {
    id: "cedar",
    name: "Cedar",
    floor: "Floor 1",
    seats: 6,
    equipment: ["Screen", "Whiteboard"],
    amenities: ["Natural light"],
    laterToday: [{ start: "2:00 PM", end: "3:00 PM" }],
    waitlistCount: 1,
  },
  {
    id: "birch",
    name: "Birch",
    floor: "Floor 3",
    seats: 10,
    equipment: ["Screen", "Video bar"],
    amenities: ["Step-free access", "Quiet floor"],
    laterToday: [{ start: "4:00 PM", end: "5:00 PM" }],
    waitlistCount: 3,
  },
];

export const loadErrorMessage = "Couldn't load free rooms.";

/** How long a hold lasts before it ends by itself. */
export const HOLD_MINUTES = 15;

/** How long, on the Waitlist page, until the first room a person waits for frees up. A demo stands in for someone cancelling. */
export const FREE_UP_SECONDS = 30;

export function roomById(id: string): Room | undefined {
  return sampleRooms.find((room) => room.id === id) ?? fullRooms.find((room) => room.id === id);
}

export function isFreeRoom(id: string): boolean {
  return sampleRooms.some((room) => room.id === id);
}

export function isFullRoom(id: string): boolean {
  return fullRooms.some((room) => room.id === id);
}

type Screen =
  | { readonly status: "loading" }
  | { readonly status: "no-rooms" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "choosing"; readonly page: "rooms" }
  | {
      readonly status: "choosing";
      readonly page: "booking";
      readonly roomId: string;
      readonly duration: Duration;
      readonly detailsOpen: boolean;
    }
  | { readonly status: "booked"; readonly roomId: string; readonly duration: Duration }
  | { readonly status: "held"; readonly roomId: string; readonly duration: Duration }
  | { readonly status: "expired"; readonly roomId: string; readonly duration: Duration }
  /** The Waitlist page with no room joined. `left` is the room just left, if any. `roomsFree` says which Rooms page to go back to. */
  | { readonly status: "waitlist"; readonly roomsFree: boolean; readonly left: string | null }
  /** The Waitlist page while the person waits for at least one room. */
  | { readonly status: "waiting"; readonly roomsFree: boolean }
  /** The Waitlist page after `roomId`, which the person waited for, freed up. `left` is the room they last left the waitlist for since then. */
  | { readonly status: "freed"; readonly roomsFree: boolean; readonly roomId: string; readonly left: string | null };

/** Every state carries the full rooms the person waits for, so leaving the Waitlist page keeps their place. */
export type FlowState = Screen & { readonly waitingFor: readonly string[] };

export type FlowEvent =
  | { readonly type: "loaded"; readonly rooms: readonly Room[] }
  | { readonly type: "failed"; readonly message: string }
  | { readonly type: "retry" }
  | { readonly type: "hold-ended" }
  | { readonly type: "room-freed"; readonly roomId: string }
  | { readonly type: "open-waitlist" }
  | { readonly type: "open-rooms" }
  | { readonly type: "join-waitlist"; readonly roomId: string }
  | { readonly type: "leave-waitlist"; readonly roomId: string }
  | { readonly type: "choose-room"; readonly roomId: string }
  | { readonly type: "back" }
  | { readonly type: "set-duration"; readonly duration: Duration }
  | { readonly type: "open-details" }
  | { readonly type: "close-details" }
  | { readonly type: "book" }
  | { readonly type: "hold" };

export function isModeledState(value: string): value is ModeledState {
  return (modeledStates as readonly string[]).includes(value);
}

export function isDuration(value: string): value is Duration {
  return (durations as readonly string[]).includes(value);
}
