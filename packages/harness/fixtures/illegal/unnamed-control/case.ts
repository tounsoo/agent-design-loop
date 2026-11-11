/** Illegal: an icon-only button with no label. Every declaration holds, and a screen reader still announces the button as only "button". */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/unnamed-control",
    },
    flows: [
      {
        states: "packages/harness/fixtures/announced-progress/states.ts",
        views: "packages/harness/fixtures/illegal/unnamed-control/views.ts",
      },
    ],
  },
  checks: [
    { run: "check:accessible-names", fails: 'button <button type="button" class="more-actions"> has no accessible name' },
  ],
};
