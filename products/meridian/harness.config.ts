import type { HarnessConfig } from "@agent-design-loop/harness";

/**
 * Meridian's paths for the harness checks, and the design system adapter
 * that names Todae's parts for them. Plain literals only: the inventory check
 * reads this file at the pull request base with `git show`. Changing it
 * changes what every check reads, so a change needs a proposal under
 * proposals/, and CODEOWNERS asks for review.
 */
export default {
  adapter: "packages/adapter-todae/index.ts",
  paths: {
    source: "products/meridian",
    features: "products/meridian/features",
    layouts: "products/meridian/layouts",
    contentLayouts: "products/meridian/content-layouts",
    pageTypes: "products/meridian/page-types",
    catalog: "products/meridian/catalog/index.ts",
    inputs: "products/meridian/inputs/product.ts",
    rules: "products/meridian/rules/ux-rules.ts",
    styles: "products/meridian/styles.css",
    app: ["products/meridian/preview", "products/meridian/App.tsx", "products/meridian/main.tsx"],
    web: "products/meridian",
  },
  shells: {
    primarySlots: { detail: "Primary" },
    collections: { collection: ["Heading", "Description"] },
  },
  flows: [
    {
      states: "products/meridian/flows/invoice-approval/states.ts",
      views: "products/meridian/features/invoice-approval/views.tsx",
      tasks: {
        "approve-vendor-invoice": "products/meridian/flows/invoice-approval/graph.ts",
      },
    },
  ],
} satisfies HarnessConfig;
