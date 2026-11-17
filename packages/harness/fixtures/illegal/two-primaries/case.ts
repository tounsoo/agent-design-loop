/** Illegal: two buttons in the detail page's primary slot. With `--json`, the finding is in the report, with its file and line. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/two-primaries",
    },
  },
  checks: [
    { run: "lint:slots", fails: "accepts exactly one primary button, found 2 primary" },
    { run: "lint:slots", args: ["--json"], fails: '"status":"fail","findings":[{"message":"packages/harness/fixtures/illegal/two-primaries/page.tsx:10: primary slot accepts exactly one primary button, found 2 primary and 2 Button.Root.","file":"packages/harness/fixtures/illegal/two-primaries/page.tsx","line":10}]}' },
  ],
};
