/** Illegal: the two-task product with a task graph for only one of its two tasks. */
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
        },
        previews: {
          reminded: ["page=detail"],
        },
      },
    ],
  },
  checks: [
    { run: "check:step-budget", fails: 'task "archive-note" has no task graph' },
  ],
};
