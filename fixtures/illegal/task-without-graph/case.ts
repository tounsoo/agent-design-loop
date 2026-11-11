/** Illegal: the two-task product with a task graph for only one of its two tasks. */
export default {
  config: {
    paths: {
      inputs: "fixtures/two-tasks/inputs.ts",
    },
    flows: [
      {
        states: "fixtures/two-tasks/states.ts",
        views: "fixtures/two-tasks/states.ts",
        tasks: {
          "send-reminder": "fixtures/two-tasks/flows/send-reminder.ts",
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
