/** Legal: the fixture product as it is. Every check passes it, so a case fails for what it changes, and npm run new:product starts a product from a copy that passes. */
export default {
  checks: [
    { run: "check:opt-outs", passes: "has no opt-outs, so every harness rule applies" },
    { run: "lint:product-ui", passes: "off-catalog: clean" },
    { run: "lint:slots", passes: "exactly one primary button on 1 detail page" },
    { run: "check:step-budget", passes: "step budget: within budget." },
    { run: "check:disclosure", passes: "across 2 pages" },
    { run: "check:priority", passes: '"Approve" is the primary button' },
    { run: "check:one-thing", passes: "one job per page on 2 pages" },
    { run: "check:inventories", passes: "membership matches" },
    { run: "check:state-coverage", passes: "7 scenarios cover every modeled state, each id once." },
    { run: "check:target-size", args: ["--list"], passes: "target size: 7 scenarios cover 6 modeled states." },
    { run: "check:accessible-names", args: ["--list"], passes: "7 scenarios declare 7 announcements" },
    { run: "check:target-size", passes: "controls on 7 scenarios at 1280 by 900 and 390 by 844, in light, meet 24 CSS px" },
    { run: "check:rendered-page", passes: '7 scenarios at 1280 by 900 and 390 by 844: section headings sit 2 type-scale steps below the title (list items 1), "Approve" is in the first view in' },
    { run: "check:accessible-names", passes: "7 scenarios announce the 7 things their flows declare, and every control has a name at 1280 by 900 and at 390 by 844. 9 of 9 presses" },
  ],
};
