import type { AccessibleNames } from "../../../index";

/** What each Waitlist state says: who the person waits for, and each row's one action. */
export const accessibleNames = {
  waitlist: [
    { role: "button", name: "Join waitlist for Cedar" },
    { role: "button", name: "Join waitlist for Birch" },
  ],
  waiting: [
    { role: "status", text: "You're on the waitlist for Cedar. If a room frees up, it shows here." },
    { role: "button", name: "Leave waitlist for Cedar" },
  ],
  freed: [
    { role: "status", text: "Cedar is free now. Choose it to book it." },
    { role: "button", name: "Choose Cedar" },
    { role: "button", name: "Leave waitlist for Birch" },
  ],
} satisfies AccessibleNames;

/** The silent leave, listed with no fixIn, so nothing tracks its fix and the gap could wait forever. Not `satisfies KnownGaps`, which would refuse it before the check reads it. */
export const knownGaps = [
  {
    presses: ['button "Leave waitlist for Birch"'],
    problem: "silent",
    scenarios: ["freed"],
    why: "Leaving while a room is free changes only the button. Say it in the status region.",
  },
];
