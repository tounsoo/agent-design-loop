/** Illegal: a button whose variant is computed. The check cannot tell whether it is a second primary, so it fails it. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/computed-variant",
    },
  },
  checks: [
    { run: "check:priority", fails: "has a computed variant, so the check cannot tell whether it is primary" },
  ],
};
