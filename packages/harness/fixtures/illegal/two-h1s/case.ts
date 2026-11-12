/** Illegal: a section set as a second h1. A page has one h1, its title. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/two-h1s",
    },
  },
  checks: [{ run: "check:rendered-page", fails: 'h1 "Activity" is a second h1. A page has one h1, its title "Northwind Office Supply"' }],
};
