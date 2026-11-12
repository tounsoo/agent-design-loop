/** Illegal: Nook's Waitlist rows from pull request 42 before its fix. Joining swaps the row's Join waitlist button for a new Leave waitlist button, and focus falls to the page body. The status region says the right thing, and the check still fails. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/waitlist-row-loses-focus",
    },
    flows: [
      {
        states: "packages/harness/fixtures/announced-waitlist/states.ts",
        views: "packages/harness/fixtures/illegal/waitlist-row-loses-focus/main.tsx",
      },
    ],
  },
  checks: [
    { run: "check:accessible-names", fails: 'pressing button "Join waitlist for Cedar" removes it from the page, and focus falls to the page body' },
  ],
};
