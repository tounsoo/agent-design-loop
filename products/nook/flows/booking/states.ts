/** The states Nook models. Every one has a view, and check:target-size opens each one. */
export const modeledStates = ["loading", "no-rooms", "error", "choosing", "booked", "held"] as const;

export type ModeledState = (typeof modeledStates)[number];

export type Page = "rooms" | "booking";

export const durations = ["30", "60", "90"] as const;

export type Duration = (typeof durations)[number];

export const durationLabel: Record<Duration, string> = {
  "30": "30 minutes",
  "60": "1 hour",
  "90": "1 hour 30 minutes",
};

export type Room = {
  readonly id: string;
  readonly name: string;
  readonly floor: string;
  readonly seats: number;
  readonly equipment: readonly string[];
};

export const sampleRooms: readonly Room[] = [
  { id: "harbor", name: "Harbor", floor: "Floor 2", seats: 4, equipment: ["Screen", "Whiteboard"] },
  { id: "lantern", name: "Lantern", floor: "Floor 2", seats: 8, equipment: ["Screen", "Video bar", "Whiteboard"] },
  { id: "quarry", name: "Quarry", floor: "Floor 3", seats: 2, equipment: ["Phone"] },
];

export const loadErrorMessage = "Couldn't load free rooms.";

export function roomById(id: string): Room | undefined {
  return sampleRooms.find((room) => room.id === id);
}

export type FlowState =
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
  | { readonly status: "held"; readonly roomId: string };

export type FlowEvent =
  | { readonly type: "loaded"; readonly rooms: readonly Room[] }
  | { readonly type: "failed"; readonly message: string }
  | { readonly type: "retry" }
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
