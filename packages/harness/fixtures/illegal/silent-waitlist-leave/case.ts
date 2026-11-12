/** Illegal: Nook's Waitlist from pull request 42 after its first fix and before its second. Leaving Birch's waitlist while Cedar is free turns the row's button into Join waitlist, keeps focus on it, and leaves the status region as it was, so a screen reader hears nothing. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/silent-waitlist-leave",
    },
    flows: [
      {
        states: "packages/harness/fixtures/announced-waitlist/states.ts",
        views: "packages/harness/fixtures/illegal/silent-waitlist-leave/main.tsx",
      },
    ],
  },
  checks: [
    { run: "check:accessible-names", fails: 'pressing button "Leave waitlist for Birch" changes the page, and a screen reader hears nothing' },
  ],
};
