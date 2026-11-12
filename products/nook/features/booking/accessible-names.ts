import type { AccessibleNames } from "@agent-design-loop/harness";

/**
 * What a screen reader hears on each preview of the booking flow.
 * check:accessible-names opens each one in Chrome and compares. Declare what
 * changes between states: what a live region or progress bar says, and which
 * actions are on offer or turned off. The top bar is on every preview: which
 * place is current, and whether both are turned off.
 */

const rooms = { role: "heading", name: "Book a room" };

function topBar(current: "Rooms" | "Waitlist", locked: boolean) {
  return [
    { role: "button", name: "Rooms", disabled: locked, ...(current === "Rooms" ? { current: "page" } : {}) },
    { role: "button", name: "Waitlist", disabled: locked, ...(current === "Waitlist" ? { current: "page" } : {}) },
  ] as const;
}

export const accessibleNames = {
  "state=loading": [...topBar("Rooms", true), rooms, { role: "progressbar", name: "Loading free rooms" }],
  "state=no-rooms": [...topBar("Rooms", false), rooms, { role: "heading", name: "No rooms are free" }, { role: "button", name: "See the waitlist" }],
  "state=error": [...topBar("Rooms", true), rooms, { role: "button", name: "Try again" }],
  "state=choosing&page=rooms": [...topBar("Rooms", false), rooms, { role: "button", name: "Choose Harbor" }, { role: "button", name: "Choose Lantern" }, { role: "button", name: "Choose Quarry" }],
  "state=choosing&page=booking": [
    ...topBar("Rooms", false),
    { role: "heading", name: "Harbor" },
    { role: "combobox", name: "How long?", disabled: false },
    { role: "button", name: "Hold room", disabled: false },
    { role: "button", name: "Book room", disabled: false },
  ],
  "state=booked": [
    ...topBar("Rooms", true),
    { role: "status", text: "Room booked Harbor is yours for 1 hour." },
    { role: "button", name: "Book room", disabled: true },
    { role: "button", name: "All rooms", disabled: true },
  ],
  "state=held": [
    ...topBar("Rooms", true),
    { role: "status", text: "Room held Harbor is held for you for 15 minutes. Book it to keep it." },
    { role: "button", name: "Hold room", disabled: true },
    { role: "button", name: "Book room", disabled: false },
  ],
  "state=expired": [
    ...topBar("Rooms", false),
    { role: "status", text: "Hold ended Harbor is no longer held for you. Book it now, or pick another room." },
    { role: "button", name: "Hold room", disabled: true },
    { role: "button", name: "Book room", disabled: false },
    { role: "button", name: "All rooms", disabled: false },
  ],
  "state=waitlist": [
    ...topBar("Waitlist", false),
    { role: "heading", name: "Waitlist" },
    { role: "button", name: "Join the waitlist for Cedar" },
    { role: "button", name: "Join the waitlist for Birch" },
  ],
  "state=waiting": [
    ...topBar("Waitlist", false),
    { role: "status", text: "You're on the waitlist for Cedar. If a room frees up, it shows here." },
    { role: "button", name: "Leave the waitlist for Cedar" },
    { role: "button", name: "Join the waitlist for Birch" },
  ],
  "state=freed": [
    ...topBar("Waitlist", false),
    { role: "status", text: "Cedar is free now. Choose it to book it." },
    { role: "button", name: "Choose Cedar" },
    { role: "button", name: "Leave the waitlist for Birch" },
  ],
} satisfies AccessibleNames;
