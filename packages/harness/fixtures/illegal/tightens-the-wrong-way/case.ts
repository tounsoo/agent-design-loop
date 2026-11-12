/** Illegal: the change lowers TARGET_MIN_PX from 24 to 20, and a proposal the change adds lists TARGET_MIN_PX under tightens. A smaller touch target loosens the rule, so the proposal covers nothing. */
export default {
  config: { paths: { rules: "packages/harness/fixtures/illegal/adds-alongside-a-rule-change/rules.ts" } },
  base: {},
  proposals: "packages/harness/fixtures/illegal/tightens-the-wrong-way/proposals",
  checks: [
    { run: "check:inventories", fails: 'lists "TARGET_MIN_PX" under tightens, but 24 to 20 loosens it, so it covers nothing' },
  ],
};
