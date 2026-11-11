/** Illegal: the two-task product with its second task over budget. */
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
          "archive-note": "fixtures/illegal/second-task-over-budget/archive-note.ts",
        },
        previews: {
          reminded: ["page=detail"],
        },
      },
    ],
  },
  checks: [
    { run: "check:step-budget", fails: "modeled path length 3 exceeds max_steps 2 for archive-note" },
  ],
};
