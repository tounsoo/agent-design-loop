/** Illegal: the two-task product with archive-note mapped to a graph that exports no taskId, so the mapping alone says which task it models. */
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
          "archive-note": "packages/harness/fixtures/illegal/graph-without-task-id/archive-note.ts",
        },
      },
    ],
  },
  checks: [
    { run: "check:step-budget", fails: "does not export a taskId" },
  ],
};
