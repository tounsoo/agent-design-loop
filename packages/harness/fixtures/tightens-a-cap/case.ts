/** Legal: the change raises TARGET_MIN_PX from 24 to 32, a stricter rule input, and a proposal the change adds lists TARGET_MIN_PX under tightens, already adopted. A tightening takes one pull request. */
export default {
  config: { paths: { rules: "packages/harness/fixtures/tightens-a-cap/rules.ts" } },
  base: {},
  proposals: "packages/harness/fixtures/tightens-a-cap/proposals",
  checks: [
    { run: "check:inventories", passes: "TARGET_MIN_PX changed from 24 to 32. Adopts" },
  ],
};
