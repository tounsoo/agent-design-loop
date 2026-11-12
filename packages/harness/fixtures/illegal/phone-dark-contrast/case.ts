/** Illegal: the text turns light on the white page only on a phone in the dark scheme. Light passes at both widths and dark passes at 1280 by 900, so only the phone's dark view finds it. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/phone-dark-contrast",
    },
  },
  checks: [
    { run: "check:rendered-page", fails: 'dark colour scheme: text under WCAG AA contrast: "Northwind Office Supply" is #eeeeee on #ffffff, 1.16:1, under 3:1; "Total due" is #eeeeee on #ffffff, 1.16:1, under 4.5:1. At 390 by 844.' },
  ],
};
