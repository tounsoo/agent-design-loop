/** Illegal: Approve, the rank-1 action, sits under 1000 px of content, below the first view at desktop and phone width, as PR 49's was before it pinned its action row. */
export default {
  config: {
    paths: {
      web: "packages/harness/fixtures/illegal/primary-below-the-fold",
    },
  },
  checks: [
    { run: "check:rendered-page", fails: 'at 1280 by 900: "Approve" is at' },
    { run: "check:rendered-page", fails: 'at 390 by 844: "Approve" is at' },
  ],
};
