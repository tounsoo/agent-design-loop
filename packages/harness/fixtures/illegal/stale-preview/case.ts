/** Illegal: a preview query for "confirming", which is not a modeled state, so it opens nothing. */
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
        previews: {
          reminded: ["page=detail"],
          confirming: ["page=detail"],
        },
      },
    ],
  },
  checks: [
    { run: "check:target-size", args: ["--list"], fails: 'previews names "confirming", which is not a modeled state' },
  ],
};
