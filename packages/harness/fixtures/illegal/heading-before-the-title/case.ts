/** Illegal: an h2 above the h1. The title is the page's first heading. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/heading-before-the-title",
    },
  },
  checks: [{ run: "check:rendered-page", fails: 'h2 "Invoice INV-2041" comes before the title "Northwind Office Supply". The title is the page\'s first heading.' }],
};
