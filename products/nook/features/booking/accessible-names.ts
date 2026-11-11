import type { AccessibleNames } from "@agent-design-loop/harness";

/**
 * What a screen reader hears on each preview of the booking flow.
 * check:accessible-names opens each one in Chrome and compares. Declare what
 * changes between states: what a live region or progress bar says, and which
 * actions are on offer or turned off.
 */

const rooms = { role: "heading", name: "Book a room" };

export const accessibleNames = {
  "state=loading": [rooms, { role: "progressbar", name: "Loading free rooms" }],
  "state=no-rooms": [rooms, { role: "heading", name: "No rooms are free" }],
  "state=error": [rooms, { role: "button", name: "Try again" }],
  "state=choosing&page=rooms": [rooms, { role: "button", name: "Choose Harbor" }, { role: "button", name: "Choose Lantern" }, { role: "button", name: "Choose Quarry" }],
  "state=choosing&page=booking": [
    { role: "heading", name: "Harbor" },
    { role: "combobox", name: "How long?", disabled: false },
    { role: "button", name: "Hold room", disabled: false },
    { role: "button", name: "Book room", disabled: false },
  ],
  "state=booked": [
    { role: "status", text: "Room booked Harbor is yours for 1 hour." },
    { role: "button", name: "Book room", disabled: true },
    { role: "button", name: "All rooms", disabled: true },
  ],
  "state=held": [
    { role: "status", text: "Room held Harbor is held for you for 15 minutes. Book it to keep it." },
    { role: "button", name: "Hold room", disabled: true },
    { role: "button", name: "Book room", disabled: false },
  ],
} satisfies AccessibleNames;
