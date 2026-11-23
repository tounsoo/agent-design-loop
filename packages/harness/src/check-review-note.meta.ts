import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "A review note does not claim a held booking takes a held length, that step-budget measures one route, or a proposal rule the check does not have.",
  fails: [
    "A Nook review note says a booking takes the held length while transition copies the length chosen before the hold.",
    "A review note says check:step-budget measures one route, or only the shortest, while the check calls measureRoutes. A bullet that says the check does not see a change is not that claim.",
    "A review note bullet that restates which statuses' lists are pinned leaves a status out, or leaves out a new proposal that starts adopted with gated lists. A check:proposals bullet that does not restate that pinning is not required to.",
    "A review note says every other inventory cannot be introduced when the base lacks it, and leaves out the design system adapter.",
    "A review note says an addition passes by listing the id, or a rename lists that one id, while an addition keeps every base member and a rename lists both.",
    "A string the rule reads, such as measureRoutes or before.status !== \"open\", is not in the file the message names.",
  ],
  details: [
    "The note is the review's record, so the check does not generate it from the checks. It compares the sentences that were false with the code they describe, and names the file when the string it reads is gone, so the rule cannot switch itself off. `packages/harness/src/lib/review-note-claim.test.ts` feeds it Meridian's inventories and content-layouts notes from before d935b9b and Nook's book-a-held-room note from before 9b00127, with the checks as they were then. It skips when the commit is not in the clone. The row in the rule table is text: the check holds five historical sentences, not every way a note can be wrong.",
  ],
} satisfies CheckMeta;
