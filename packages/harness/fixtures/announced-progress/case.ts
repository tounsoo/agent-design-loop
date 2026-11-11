/** Legal: Meridian's invoice progress list as pull request 32 fixed it, built with Todae's Steps. After Approve, the current Payment stage reads "Next", as its declarations say. check:accessible-names builds this folder's index.html. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/announced-progress",
    },
    flows: [
      {
        states: "packages/harness/fixtures/announced-progress/states.ts",
        views: "packages/harness/fixtures/announced-progress/main.tsx",
      },
    ],
  },
  checks: [
    { run: "check:accessible-names", passes: "3 previews announce the 7 things their flows declare" },
  ],
};
