/** Legal: the fixture product as it is. Every check passes it, so a case fails only for what it changes. */
export default {
  checks: [
    { run: "lint:product-ui", passes: "off-catalog: clean" },
    { run: "lint:slots", passes: "exactly one primary button on 1 detail page" },
    { run: "check:step-budget", passes: "step budget: within budget." },
    { run: "check:disclosure", passes: "across 2 pages" },
    { run: "check:priority", passes: '"Approve" is the primary button' },
    { run: "check:one-thing", passes: "one job per page on 2 pages" },
    { run: "check:inventories", passes: "membership matches" },
    { run: "check:state-coverage", passes: "6 modeled states have views" },
    { run: "check:target-size", args: ["--list"], passes: "7 previews from modeledStates" },
  ],
};
