import type { AccessibleNames, KnownGaps } from "@agent-design-loop/harness";

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
  "state=expired": [
    { role: "status", text: "Hold ended Harbor is no longer held for you. Book it now, or pick another room." },
    { role: "button", name: "Hold room", disabled: true },
    { role: "button", name: "Book room", disabled: false },
    { role: "button", name: "All rooms", disabled: false },
  ],
} satisfies AccessibleNames;

/**
 * Presses that change the page without telling a screen reader, found when
 * check:accessible-names began pressing every action. Each waits for a fix in
 * its own pull request, and the check fails an entry once its press is fixed,
 * so this list only shrinks.
 */
export const knownGaps = [
  {
    presses: ['button "Choose Harbor"', 'button "Choose Lantern"', 'button "Choose Quarry"'],
    problem: "focus lost",
    previews: ["state=choosing&page=rooms"],
    why: "Choosing a room replaces the rooms page with its booking page, and nothing moves focus to the new page. Move focus to the new page's title.",
  },
  {
    presses: ['button "All rooms"'],
    problem: "focus lost",
    previews: ["state=choosing&page=booking", "state=expired"],
    why: "All rooms replaces the booking page with the rooms page, and nothing moves focus to the new page. Move focus to the new page's title.",
  },
  {
    presses: ['button "Hold room"'],
    problem: "focus lost",
    previews: ["state=choosing&page=booking"],
    why: "The button turns itself off, and Chrome drops focus to the page body; the status region does say what happened. Move focus to that status, or to the next action.",
  },
  {
    presses: ['button "Book room"'],
    problem: "focus lost",
    previews: ["state=choosing&page=booking", "state=held", "state=expired"],
    why: "The button turns itself off, and Chrome drops focus to the page body; the status region does say what happened. Move focus to that status, or to the next action.",
  },
  {
    presses: ['button "Try again"'],
    problem: "focus lost",
    previews: ["state=error"],
    why: "Try again replaces the error, and the button with it, with the loader, so focus falls to the page body. Move focus to the loader, or keep a focusable element in the button's place.",
  },
] satisfies KnownGaps;
