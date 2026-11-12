import type { AccessibleNames, KnownGaps } from "@agent-design-loop/harness";

/**
 * What a screen reader hears on each scenario of the booking flow.
 * check:accessible-names opens each one in Chrome and compares. Declare what
 * changes between states: what a live region or progress bar says, and which
 * actions are on offer or turned off. The top bar is on every scenario: which
 * place is current, and whether both are turned off.
 */

const rooms = { role: "heading", name: "Book a room" };

function topBar(current: "Rooms" | "Waitlist", locked: boolean) {
  return [
    { role: "button", name: "Rooms", disabled: locked, ...(current === "Rooms" ? { current: "page" } : {}) },
    { role: "button", name: "Waitlist", disabled: locked, ...(current === "Waitlist" ? { current: "page" } : {}) },
  ] as const;
}

/**
 * The booking page for one room: its name heads the page, its later bookings
 * and amenities are lists when it has any, and every control on it is on offer.
 */
function booking(room: string, later?: string, amenities?: string) {
  return [
    ...topBar("Rooms", false),
    { role: "heading", name: room },
    { role: "combobox", name: "How long?", disabled: false },
    { role: "heading", name: "Later today" },
    ...(later === undefined ? [] : [{ role: "list", text: later } as const]),
    { role: "heading", name: "Amenities" },
    ...(amenities === undefined ? [] : [{ role: "list", text: amenities } as const]),
    { role: "button", name: "Hold room", disabled: false },
    { role: "button", name: "Book room", disabled: false },
  ] as const;
}

export const accessibleNames = {
  loading: [...topBar("Rooms", true), rooms, { role: "progressbar", name: "Loading free rooms" }],
  "no-rooms": [...topBar("Rooms", false), rooms, { role: "heading", name: "No rooms are free" }, { role: "button", name: "See the waitlist" }],
  error: [...topBar("Rooms", true), rooms, { role: "button", name: "Try again" }],
  rooms: [...topBar("Rooms", false), rooms, { role: "button", name: "Choose Harbor" }, { role: "button", name: "Choose Lantern" }, { role: "button", name: "Choose Quarry" }],
  "booking-harbor": booking("Harbor", "1:00 PM to 2:00 PM 3:30 PM to 4:30 PM", "Natural light Step-free access"),
  "booking-lantern": booking(
    "Lantern",
    "12:30 PM to 1:30 PM 1:30 PM to 3:00 PM 3:00 PM to 4:00 PM 4:00 PM to 5:00 PM 5:00 PM to 6:00 PM",
    "Step-free access Quiet floor Near the kitchen Blackout blinds Daylight and a view of the harbor",
  ),
  "booking-quarry": booking("Quarry"),
  booked: [
    ...topBar("Rooms", true),
    { role: "status", text: "Room booked Harbor is yours for 1 hour." },
    { role: "button", name: "Book room", disabled: true },
    { role: "button", name: "All rooms", disabled: true },
  ],
  held: [
    ...topBar("Rooms", true),
    { role: "status", text: "Room held Harbor is held for you for 15 minutes. Book it to keep it." },
    { role: "button", name: "Hold room", disabled: true },
    { role: "button", name: "Book room", disabled: false },
  ],
  expired: [
    ...topBar("Rooms", false),
    { role: "status", text: "Hold ended Harbor is no longer held for you. Book it now, or pick another room." },
    { role: "button", name: "Hold room", disabled: true },
    { role: "button", name: "Book room", disabled: false },
    { role: "button", name: "All rooms", disabled: false },
  ],
  waitlist: [
    ...topBar("Waitlist", false),
    { role: "heading", name: "Waitlist" },
    { role: "button", name: "Join waitlist for Cedar" },
    { role: "button", name: "Join waitlist for Birch" },
  ],
  waiting: [
    ...topBar("Waitlist", false),
    { role: "status", text: "You're on the waitlist for Cedar. If a room frees up, it shows here." },
    { role: "button", name: "Leave waitlist for Cedar" },
    { role: "button", name: "Join waitlist for Birch" },
  ],
  freed: [
    ...topBar("Waitlist", false),
    { role: "status", text: "Cedar is free now. Choose it to book it. You're still on the waitlist for Birch." },
    { role: "button", name: "Choose Cedar" },
    { role: "button", name: "Leave waitlist for Birch" },
  ],
} satisfies AccessibleNames;

/**
 * Presses that change the page without telling a screen reader. The top bar
 * moves focus to the new page's title on every page change, and submits keep
 * focus (`submitOff`), so what is left changes one page in place. Each entry
 * names where its fix is tracked, and the check fails an entry once its press
 * is fixed, so this list only shrinks.
 */
export const knownGaps = [
  {
    presses: ['button "Try again"'],
    problem: "focus lost",
    scenarios: ["error"],
    why: "Try again replaces the error, and the button with it, with the loader, so focus falls to the page body. Move focus to the loader, or keep a focusable element in the button's place.",
    fixIn: "https://github.com/tounsoo/agent-design-loop/issues/50",
  },
] satisfies KnownGaps;
