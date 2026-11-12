/** Illegal: an h3 straight after the h1 skips h2, so a screen reader's list of headings jumps a level. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/skipped-heading-level",
    },
  },
  checks: [{ run: "check:rendered-page", fails: 'h3 "Vendor" skips a level: it follows h1 "Northwind Office Supply", so it is h2 or a level above.' }],
};
