/** Illegal: the shell clips the document to the view, so the document never grows, but the page inside it is 640 px wide on a 390 px phone and scrolls sideways in its pane. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/cut-off-in-an-app-shell",
    },
  },
  checks: [
    { run: "check:rendered-page", fails: "at 390 by 844: the page is wider than main, which it lays out in: 640 CSS px in 390, so it scrolls sideways or is cut off. Past the edge: div.line-items" },
  ],
};
