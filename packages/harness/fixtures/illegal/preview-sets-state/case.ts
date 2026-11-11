/** Illegal: the preview query for "reminded" sets state=archived itself, so it would open another state than its key names. */
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
          reminded: ["state=archived&page=detail"],
        },
      },
    ],
  },
  checks: [
    { run: "check:target-size", args: ["--list"], fails: "sets state itself" },
  ],
};
