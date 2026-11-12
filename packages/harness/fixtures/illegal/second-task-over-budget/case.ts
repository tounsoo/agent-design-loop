/** Illegal: the two-task product with its second task over budget. */
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
          "archive-note": "packages/harness/fixtures/illegal/second-task-over-budget/archive-note.ts",
        },
      },
    ],
  },
  checks: [
    { run: "check:step-budget", fails: "modeled path length 3 exceeds max_steps 2 for archive-note" },
  ],
};
