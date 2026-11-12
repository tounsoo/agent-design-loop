/** Illegal: a 24 px section heading under a 30 px title, one step of Todae's type scale. Sections sit at least two steps below the title, as PR 48 and PR 49's Later today, Amenities, Vendor and Activity did not. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/section-heading-near-title",
    },
  },
  checks: [
    { run: "check:rendered-page", fails: 'section heading h2 "Vendor" is 24px, 1 type-scale step below the title' },
  ],
};
