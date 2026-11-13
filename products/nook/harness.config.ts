import type { HarnessConfig } from "@agent-design-loop/harness";

/**
 * Nook's paths for the harness checks, and the design system adapter
 * that names Todae's parts for them. Plain literals only: the inventory check
 * reads this file at the pull request base with `git show`. Changing it
 * changes what every check reads, so a change needs a proposal under
 * proposals/, and CODEOWNERS asks for review.
 *
 * Run every check on it with `npm run check:product -- --config products/nook/harness.config.ts`.
 */
export default {
  adapter: "packages/adapter-todae/index.ts",
  paths: {
    source: "products/nook",
    features: "products/nook/features",
    layouts: "products/nook/layouts",
    contentLayouts: "products/nook/content-layouts",
    pageTypes: "products/nook/page-types",
    catalog: "products/nook/catalog/index.ts",
    inputs: "products/nook/inputs.ts",
    rules: "products/nook/rules.ts",
    styles: "products/nook/styles.css",
    app: ["products/nook/preview", "products/nook/App.tsx", "products/nook/main.tsx"],
    web: "products/nook",
  },
  shells: {
    primarySlots: { booking: "Action" },
    collections: { rooms: ["Title", "Intro"] },
    chrome: { booking: ["Title", "Facts"] },
  },
  flows: [
    {
      states: "products/nook/flows/booking/states.ts",
      views: "products/nook/features/booking/views.tsx",
      tasks: {
        "book-room": "products/nook/flows/booking/book-room.ts",
        "hold-room": "products/nook/flows/booking/hold-room.ts",
      },
    },
  ],
} satisfies HarnessConfig;
