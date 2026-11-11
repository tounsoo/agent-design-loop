import type { HarnessConfig } from "../../../scripts/lib/config";

/**
 * Illegal: the two-task product with only send-reminder mapped. archive-note
 * is in tasks with no task graph, so its budget would never be measured.
 * Paths the checks it runs do not read stay on Meridian's.
 */
export default {
  adapter: "adapters/todae.ts",
  paths: {
    source: "src",
    features: "src/features",
    layouts: "src/layouts",
    contentLayouts: "src/content-layouts",
    pageTypes: "src/page-types",
    catalog: "src/catalog/index.ts",
    inputs: "fixtures/two-tasks/inputs.ts",
    rules: "src/rules/ux-rules.ts",
    styles: "src/styles.css",
    app: ["src/harness", "src/App.tsx", "src/main.tsx"],
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
} satisfies HarnessConfig;
