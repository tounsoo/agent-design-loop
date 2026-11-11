/** Legal: a product that names no collection. The collection rules have no page to read, and the other rules still run. */
export default {
  config: {
    shells: {
      primarySlots: { detail: "Primary" },
      collections: {},
    },
  },
  checks: [
    { run: "check:one-thing", passes: "one job per page on 2 pages" },
    { run: "check:inventories", passes: "membership matches" },
  ],
};
