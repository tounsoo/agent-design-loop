/** Illegal: the adapter makes "ghost" a primary variant, and the one graduating proposal is about a Toast. It names neither adapter.action nor the new adapter path. */
export default {
  config: { adapter: "packages/harness/fixtures/illegal/proposal-for-another-adapter-change/adapter.ts" },
  base: {},
  proposals: "packages/harness/fixtures/illegal/proposal-for-another-adapter-change/proposals",
  baseProposals: "packages/harness/fixtures/illegal/proposal-for-another-adapter-change/base-proposals",
  checks: [
    { run: "check:inventories", fails: 'a decided proposal must list "adapter.action"' },
  ],
};
