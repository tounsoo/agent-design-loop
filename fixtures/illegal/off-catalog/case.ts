/** Illegal: raw controls and a direct design system import outside the catalog. */
export default {
  config: {
    paths: {
      features: "fixtures/illegal/off-catalog",
    },
  },
  checks: [
    { run: "lint:product-ui", fails: "raw <button> is not a catalog control" },
  ],
};
