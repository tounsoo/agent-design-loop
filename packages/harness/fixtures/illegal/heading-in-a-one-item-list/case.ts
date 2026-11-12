/** Illegal: a list of one item is a section in disguise, so its heading sits two steps under the title like any section heading. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/heading-in-a-one-item-list",
    },
  },
  checks: [
    { run: "check:rendered-page", fails: 'section heading h2 "Vendor" is 24px, 1 type-scale step below the title' },
  ],
};
