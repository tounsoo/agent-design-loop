/** Legal: the page, the chrome around it, and a closed menu in the chrome have controls of at least 24 CSS px. check:target-size builds this folder's index.html. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/target-size-whole-document",
    },
  },
  checks: [
    { run: "check:target-size", passes: "controls on 7 scenarios at 1280 by 900 and 390 by 844, in light, meet 24 CSS px" },
  ],
};
