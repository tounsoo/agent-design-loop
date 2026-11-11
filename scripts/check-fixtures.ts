import { spawnSync } from "node:child_process";

const fakeAdapter = ["--adapter", "fixtures/fake-ds/adapter.ts"];
const fakeFeatures = "fixtures/fake-ds/features";
const fakeCatalog = "fixtures/fake-ds/catalog.ts";

const cases = [
  {
    name: "two-primaries",
    args: ["scripts/check-slots.ts", "--root", "fixtures/illegal/two-primaries"],
    phrase: "primary slot",
  },
  {
    name: "over-budget",
    args: ["scripts/check-step-budget.ts", "--graph", "fixtures/illegal/over-budget/graph.ts"],
    phrase: "modeled path length 4 exceeds max_steps",
  },
  {
    name: "over-budget-flow",
    args: ["scripts/check-step-budget.ts", "--graph", "fixtures/illegal/over-budget-flow/graph.ts"],
    phrase: "shipped flow path length 4 exceeds max_steps",
  },
  {
    name: "graph-flow-drift",
    args: ["scripts/check-step-budget.ts", "--graph", "fixtures/illegal/graph-flow-drift/graph.ts"],
    phrase: "does not match the modeled path",
  },
  {
    name: "task-without-graph",
    args: ["scripts/check-step-budget.ts", "--flows", "fixtures/illegal/task-without-graph/flows"],
    phrase: "has no task graph",
  },
  {
    name: "two-questions",
    args: ["scripts/check-one-thing.ts", "--features", "fixtures/illegal/two-questions"],
    phrase: "questions outside a disclosure",
  },
  {
    name: "hoisted-question",
    args: ["scripts/check-one-thing.ts", "--features", "fixtures/illegal/hoisted-question"],
    phrase: "is not reached from any page",
  },
  {
    name: "dead-question-part",
    args: ["scripts/check-one-thing.ts", "--catalog", "fixtures/illegal/dead-question-part/catalog.ts"],
    phrase: "not exported by the catalog",
  },
  {
    name: "disclosures-per-page",
    args: ["scripts/check-disclosure.ts", "--features", "fixtures/illegal/disclosures-per-page"],
    phrase: "more than 1 per page",
  },
  {
    name: "missing-disclosed-section",
    args: ["scripts/check-priority.ts", "--features", "fixtures/illegal/missing-disclosed-section"],
    phrase: "is not behind a disclosure",
  },
  {
    name: "off-catalog",
    args: ["scripts/lint-product-ui.ts", "--root", "fixtures/illegal/off-catalog"],
    phrase: "off-catalog",
  },
  {
    name: "missing-view",
    args: [
      "scripts/check-state-coverage.ts",
      "--states",
      "fixtures/illegal/missing-view/model.ts",
      "--views",
      "fixtures/illegal/missing-view/views.ts",
    ],
    phrase: "has no view",
  },
  {
    name: "undeclared-layout",
    args: ["scripts/check-inventories.ts", "--layouts", "fixtures/illegal/undeclared-layout"],
    phrase: "undeclared layout",
  },
  {
    name: "inventory-expansion",
    args: [
      "scripts/check-inventories.ts",
      "--head",
      "fixtures/illegal/inventory-expansion/head",
      "--base",
      "fixtures/illegal/inventory-expansion/base",
    ],
    phrase: "without a proposal",
  },
  {
    name: "undeclared-content-layout",
    args: ["scripts/check-inventories.ts", "--content-layouts", "fixtures/illegal/undeclared-content-layout"],
    phrase: "undeclared content layout",
  },
  {
    name: "content-layout-expansion",
    args: [
      "scripts/check-inventories.ts",
      "--head",
      "fixtures/illegal/content-layout-expansion/head",
      "--base",
      "fixtures/illegal/content-layout-expansion/base",
    ],
    phrase: "without a proposal",
  },
  {
    name: "ad-hoc-content",
    args: ["scripts/check-inventories.ts", "--features", "fixtures/illegal/ad-hoc-content"],
    phrase: "not a registered content layout",
  },
  {
    name: "fake-ds-two-primaries",
    args: ["scripts/check-slots.ts", "--root", "fixtures/illegal/fake-ds-two-primaries", ...fakeAdapter],
    phrase: "found 2 primary and 2 Action",
  },
  {
    name: "fake-ds-off-catalog",
    args: ["scripts/lint-product-ui.ts", "--root", "fixtures/illegal/fake-ds-off-catalog", ...fakeAdapter],
    phrase: 'off-catalog: import "@fake/ds" directly',
  },
];

/**
 * Legal cases must pass. fixtures/fake-ds is UI for a stand-in design system
 * that shares no name with Todae. Every check below but the off-catalog lint
 * fails it under the Todae adapter, so passing here shows the check reads its
 * names from the adapter.
 */
const legalCases = [
  {
    name: "fake-ds slots",
    args: ["scripts/check-slots.ts", "--root", fakeFeatures, ...fakeAdapter],
    phrase: "exactly one primary button on 1 detail page",
  },
  {
    name: "fake-ds priority",
    args: ["scripts/check-priority.ts", "--features", fakeFeatures, ...fakeAdapter],
    phrase: '"Approve" is the primary button',
  },
  {
    name: "fake-ds disclosure",
    args: ["scripts/check-disclosure.ts", "--features", fakeFeatures, "--catalog", fakeCatalog, ...fakeAdapter],
    phrase: "across 2 pages",
  },
  {
    name: "fake-ds one thing",
    args: ["scripts/check-one-thing.ts", "--features", fakeFeatures, "--catalog", fakeCatalog, ...fakeAdapter],
    phrase: "one shell per page type",
  },
  {
    name: "fake-ds collection body",
    args: ["scripts/check-inventories.ts", "--features", fakeFeatures, ...fakeAdapter],
    phrase: "collection bodies use a registered content layout",
  },
  {
    name: "fake-ds off-catalog",
    args: ["scripts/lint-product-ui.ts", "--root", fakeFeatures, ...fakeAdapter],
    phrase: "off-catalog: clean",
  },
];

let failed = false;

function run(args: readonly string[]) {
  const result = spawnSync(process.execPath, ["--import", "tsx", ...args], {
    encoding: "utf8",
  });
  return { result, output: `${result.stdout ?? ""}\n${result.stderr ?? ""}` };
}

for (const testCase of cases) {
  const { result, output } = run(testCase.args);
  const exited = result.status !== 0 && result.status !== null;
  const explained = output.includes(testCase.phrase);
  if (exited && explained) {
    console.log(`fixtures: ${testCase.name} failed the check as required (exit ${result.status}).`);
    continue;
  }
  failed = true;
  console.error(`fixtures: ${testCase.name} was expected to fail with "${testCase.phrase}".`);
  console.error(output.trim() || `(status ${result.status}, signal ${result.signal})`);
}

for (const testCase of legalCases) {
  const { result, output } = run(testCase.args);
  if (result.status === 0 && output.includes(testCase.phrase)) {
    console.log(`fixtures: ${testCase.name} passed the check as required.`);
    continue;
  }
  failed = true;
  console.error(`fixtures: ${testCase.name} was expected to pass with "${testCase.phrase}".`);
  console.error(output.trim() || `(status ${result.status}, signal ${result.signal})`);
}

if (failed) process.exit(1);
console.log("fixtures: illegal cases failed the checks, and legal cases passed.");
