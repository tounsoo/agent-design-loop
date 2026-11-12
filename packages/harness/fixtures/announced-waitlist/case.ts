/** Legal: Nook's Waitlist rows as pull request 42 fixed them. Each press keeps focus on the row's one button and says in the status region what changed. check:accessible-names presses every button on every preview. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/announced-waitlist",
    },
    flows: [
      {
        states: "packages/harness/fixtures/announced-waitlist/states.ts",
        views: "packages/harness/fixtures/announced-waitlist/main.tsx",
      },
    ],
  },
  checks: [
    { run: "check:accessible-names", passes: "6 of 6 presses tell a screen reader what changed and keep focus on the page" },
  ],
};
