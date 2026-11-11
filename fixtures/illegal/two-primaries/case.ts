/** Illegal: two buttons in the detail page's primary slot. */
export default {
  config: {
    paths: {
      features: "fixtures/illegal/two-primaries",
    },
  },
  checks: [
    { run: "lint:slots", fails: "primary slot" },
  ],
};
