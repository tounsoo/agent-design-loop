/** Illegal: a value placed straight under a page shell, outside its slots, is read as body, so a block held in a const fails. */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/value-under-the-shell",
    },
  },
  checks: [
    { run: "check:inventories", fails: "detail body is not a registered content layout (extra in packages/harness/fixtures/illegal/value-under-the-shell/page.tsx)" },
  ],
};
