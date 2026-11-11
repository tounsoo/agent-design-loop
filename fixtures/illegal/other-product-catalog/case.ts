/** Illegal: a page imports another product's catalog by a relative path, so it reaches parts its own catalog does not export. */
export default {
  config: {
    paths: {
      features: "fixtures/illegal/other-product-catalog",
    },
  },
  checks: [
    { run: "lint:product-ui", fails: "reaches outside this product's directories" },
  ],
};
