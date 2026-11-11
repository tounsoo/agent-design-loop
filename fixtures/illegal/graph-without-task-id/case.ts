/** Illegal: the two-task product with archive-note mapped to a graph that exports no taskId, so the mapping alone says which task it models. */
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
          "archive-note": "fixtures/illegal/graph-without-task-id/archive-note.ts",
        },
        previews: {
          reminded: ["page=detail"],
        },
      },
    ],
  },
  checks: [
    { run: "check:step-budget", fails: "does not export a taskId" },
  ],
};
