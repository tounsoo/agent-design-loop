/** Illegal: a preview query for "confirming", which is not a modeled state, so it opens nothing. */
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
          "archive-note": "fixtures/two-tasks/flows/archive-note.ts",
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
