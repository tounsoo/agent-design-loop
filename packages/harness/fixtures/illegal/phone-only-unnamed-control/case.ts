/** Illegal: the sidebar gives way to a menu button at phone width, and the button has no name. Every control has a name at 1280 by 900, so only the phone pass finds it. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/phone-only-unnamed-control",
    },
    flows: [
      {
        states: "packages/harness/fixtures/announced-progress/states.ts",
        views: "packages/harness/fixtures/illegal/phone-only-unnamed-control/views.ts",
      },
    ],
  },
  checks: [
    { run: "check:accessible-names", fails: 'at 390 by 844: button <button type="button" class="menu-button"> has no accessible name' },
  ],
};
