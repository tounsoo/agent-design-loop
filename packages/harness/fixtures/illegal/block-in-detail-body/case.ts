/** Illegal: a detail page's body holds a block the feature writes from catalog parts. Every page's body is built from registered content layouts, so a new block is a new content layout and takes a proposal (proposal 2026-11-13-page-bodies-from-content-layouts). */
export default {
  config: {
    paths: {
      features: "packages/harness/fixtures/illegal/block-in-detail-body",
    },
  },
  checks: [
    { run: "check:inventories", fails: "Disclosure.Root in packages/harness/fixtures/illegal/block-in-detail-body/page.tsx is not a registered content layout" },
  ],
};
