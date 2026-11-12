/** Illegal: the text follows the dark scheme and the page's white ground does not, as Nook's did on main before its ground took the canvas token. Light passes; dark fails. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/dark-scheme-contrast",
    },
  },
  checks: [
    { run: "check:rendered-page", fails: 'dark colour scheme: text under WCAG AA contrast: "Northwind Office Supply" is #eeeeee on #ffffff' },
  ],
};
