/** Legal: the silent leave from illegal/silent-waitlist-leave, listed in knownGaps while its fix waits for its own pull request. The check passes and counts it as known. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/silent-waitlist-leave",
    },
    flows: [
      {
        states: "packages/harness/fixtures/announced-waitlist/states.ts",
        views: "packages/harness/fixtures/listed-press-gap/views.ts",
      },
    ],
  },
  checks: [
    { run: "check:accessible-names", passes: "5 of 6 presses tell a screen reader what changed and keep focus on the page, besides 1 known gap" },
  ],
};
