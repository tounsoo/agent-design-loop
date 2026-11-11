/** Legal: a second, longer route to a task's success that fits its budget, measured and printed. */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/longer-route/inputs.ts",
    },
    flows: [
      {
        states: "packages/harness/fixtures/longer-route/states.ts",
        views: "packages/harness/fixtures/longer-route/states.ts",
        tasks: {
          "send-reminder": "packages/harness/fixtures/longer-route/flows/send-reminder.ts",
          "archive-note": "packages/harness/fixtures/longer-route/flows/archive-note.ts",
        },
      },
    ],
  },
  checks: [
    { run: "check:step-budget", passes: "longest shipped flow route (3): open-note → send-reminder → archive" },
  ],
};
