/** Illegal: knownGaps still lists the silent leave after the fix that says it, on announced-waitlist's page. A gap that no longer happens fails, so the list only shrinks. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/announced-waitlist",
    },
    flows: [
      {
        states: "packages/harness/fixtures/announced-waitlist/states.ts",
        views: "packages/harness/fixtures/illegal/stale-press-gap/views.ts",
      },
    ],
  },
  checks: [
    { run: "check:accessible-names", fails: 'knownGaps lists button "Leave waitlist for Birch" as "silent", and pressing it on scenario freed no longer has that problem' },
  ],
};
