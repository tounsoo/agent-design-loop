import type { HarnessConfig } from "../../scripts/lib/config";

/**
 * The own-sections fixture product: Meridian's paths, but its own inputs, whose
 * disclosed section is "Attachments", and its own features.
 */
export default {
  adapter: "adapters/todae.ts",
  paths: {
    source: "src",
    features: "fixtures/own-sections/features",
    layouts: "src/layouts",
    contentLayouts: "src/content-layouts",
    pageTypes: "src/page-types",
    catalog: "src/catalog/index.ts",
    inputs: "fixtures/own-sections/inputs.ts",
    rules: "src/rules/ux-rules.ts",
    styles: "src/styles.css",
    app: ["src/harness", "src/App.tsx", "src/main.tsx"],
  },
  flows: [
    {
      states: "src/flows/invoice-approval/states.ts",
      views: "src/features/invoice-approval/views.tsx",
    },
  ],
} satisfies HarnessConfig;
