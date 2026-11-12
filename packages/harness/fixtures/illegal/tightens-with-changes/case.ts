/** Illegal: the change raises TARGET_MIN_PX, and the proposal the change adds lists it under tightens and MAX_VISIBLE_QUESTIONS under changes. A proposal that tightens in one pull request lists nothing else, so this one does not parse and covers nothing. */
export default {
  config: { paths: { rules: "packages/harness/fixtures/tightens-a-cap/rules.ts" } },
  base: {},
  proposals: "packages/harness/fixtures/illegal/tightens-with-changes/proposals",
  checks: [
    { run: "check:inventories", fails: "lists tightens alongside changes" },
  ],
};
