/** Illegal: a 640 px block fits a desktop view and pushes the page past a 390 px phone's edge. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/sideways-scroll-on-a-phone",
    },
  },
  checks: [
    { run: "check:rendered-page", fails: 'at 390 by 844: the page scrolls sideways, 640 CSS px wide in a 390 px view. Past the edge: div.line-items' },
  ],
};
