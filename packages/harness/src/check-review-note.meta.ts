import type { CheckMeta } from "./lib/check-meta";

export const meta = {
  summary: "A review note does not claim a held booking takes a held length, that step-budget measures one route, or a proposal rule the check does not have.",
  fails: [
    "A Nook review note says a booking takes the held length while transition copies the length chosen before the hold.",
    "A review note says check:step-budget measures one route, or only the shortest, while the check calls measureRoutes.",
    "A review note's check:proposals sentence names a proposal whose lists change and leaves out a status the check pins, or omits a new proposal that starts adopted with gated lists.",
    "A review note says every other inventory cannot be introduced when the base lacks it, and leaves out the design system adapter.",
    "A review note says an addition passes by listing the id, or a rename lists that one id, while an addition keeps every base member and a rename lists both.",
  ],
  details: [
    "The note is the review's record, so the check does not generate it from the checks. It compares the sentences that were false with the code they describe. `packages/harness/src/lib/review-note-claim.test.ts` feeds it Meridian's inventories and content-layouts notes from before d935b9b and Nook's book-a-held-room note from before 9b00127, with the checks as they were then, and the notes this check reads.",
  ],
} satisfies CheckMeta;
