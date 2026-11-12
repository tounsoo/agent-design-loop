/** Legal: a notes inbox with two tasks, each mapped to its own task graph, and a scenario that opens one modeled state on its detail page. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/two-tasks/inputs.ts",
    },
    flows: [
      {
        states: "packages/harness/fixtures/two-tasks/states.ts",
        views: "packages/harness/fixtures/two-tasks/states.ts",
        tasks: {
          "send-reminder": "packages/harness/fixtures/two-tasks/flows/send-reminder.ts",
          "archive-note": "packages/harness/fixtures/two-tasks/flows/archive-note.ts",
        },
      },
    ],
  },
  checks: [
    { run: "check:step-budget", passes: "step budget: archive-note (max_steps 2)" },
    { run: "check:target-size", args: ["--list"], passes: "target size: scenario reminded-detail (reminded)" },
  ],
};
