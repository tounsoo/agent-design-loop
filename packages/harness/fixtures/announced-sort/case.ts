/** Legal: a sort that says its new order through Todae's announcer, which writes its live region 100 ms after announce(). check:accessible-names reads each press after that, so the press is heard. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/announced-sort",
    },
    flows: [
      {
        states: "packages/harness/fixtures/announced-sort/states.ts",
        views: "packages/harness/fixtures/announced-sort/main.tsx",
      },
    ],
  },
  checks: [
    { run: "check:accessible-names", passes: "1 of 1 presses tell a screen reader what changed and keep focus on the page" },
  ],
};
