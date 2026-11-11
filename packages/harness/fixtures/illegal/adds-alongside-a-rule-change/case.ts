/** Illegal: the change adds the side-panel layout and lowers TARGET_MIN_PX, with a proposal the change adds that lists both under adds. A proposal that names a change other than an addition is not one that only adds, so it covers neither. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/illegal/inventory-expansion/inputs.ts",
      layouts: "packages/harness/fixtures/illegal/inventory-expansion/layouts",
      rules: "packages/harness/fixtures/illegal/adds-alongside-a-rule-change/rules.ts",
    },
  },
  base: {},
  proposals: "packages/harness/fixtures/illegal/adds-alongside-a-rule-change/proposals",
  checks: [
    { run: "check:inventories", fails: 'lists "TARGET_MIN_PX" under adds, which this change removes or changes rather than adds, so it covers nothing' },
  ],
};
