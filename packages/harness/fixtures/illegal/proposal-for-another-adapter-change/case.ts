/** Illegal: the adapter makes "ghost" a primary variant, and the one new proposal is about a Toast. It says "adapter" and "action", but names neither adapter.action nor the new adapter path. */
export default {
  config: { adapter: "packages/harness/fixtures/illegal/proposal-for-another-adapter-change/adapter.ts" },
  base: {},
  proposals: "packages/harness/fixtures/illegal/proposal-for-another-adapter-change/proposals",
  checks: [
    { run: "check:inventories", fails: 'No new proposal covers it: one proposal must name "adapter.action"' },
  ],
};
