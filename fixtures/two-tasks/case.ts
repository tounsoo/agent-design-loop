/** Legal: a notes inbox with two tasks, each mapped to its own task graph, and a preview query for one modeled state only. */
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
        },
      },
    ],
  },
  checks: [
    { run: "check:step-budget", passes: "step budget: archive-note (max_steps 2)" },
    { run: "check:target-size", args: ["--list"], passes: "target size: preview ?state=archived" },
  ],
};
