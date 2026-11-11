/**
 * Illegal: archive-note's shortest path, open then archive, fits max_steps 2,
 * but the reducer also lets a reminded note be archived. That route is 3 steps.
 */
export default {
  config: {
    paths: {
      inputs: "packages/harness/fixtures/two-tasks/inputs.ts",
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
    {
      run: "check:step-budget",
      fails: "the shipped flow route open-note → send-reminder → archive takes 3 steps, which exceeds max_steps 2 for archive-note",
    },
  ],
};
