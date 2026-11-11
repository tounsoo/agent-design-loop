import type { HarnessConfig } from "./scripts/lib/config";

/**
 * Meridian's paths for the checks in scripts/, and the design system adapter
 * that names Todae's parts for them. Plain literals only: the inventory check
 * reads this file at the pull request base with `git show`. Changing it
 * changes what every check reads, so a change needs a proposal under
 * proposals/, and CODEOWNERS asks for review.
 */
export default {
  adapter: "adapters/todae.ts",
  paths: {
    source: "src",
    features: "src/features",
    layouts: "src/layouts",
    contentLayouts: "src/content-layouts",
    pageTypes: "src/page-types",
    flows: "src/flows",
    catalog: "src/catalog/index.ts",
    inputs: "src/inputs/product.ts",
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
