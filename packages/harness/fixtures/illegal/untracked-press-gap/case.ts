/** Illegal: knownGaps lists the silent leave from listed-press-gap without fixIn, so nothing tracks its fix. Every gap names the issue, pull request or proposal its fix waits on. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/silent-waitlist-leave",
    },
    flows: [
      {
        states: "packages/harness/fixtures/announced-waitlist/states.ts",
        views: "packages/harness/fixtures/illegal/untracked-press-gap/views.ts",
      },
    ],
  },
  checks: [
    { run: "check:accessible-names", args: ["--list"], fails: "knownGaps[0] needs fixIn: where its fix is tracked" },
  ],
};
