import type { HarnessConfig } from "../../scripts/lib/config";

/**
 * The fixture product: a small Todae product that passes every check. Each
 * case under fixtures/ runs the checks on this config with the paths its own
 * case.ts replaces, so a case fails for what it changes. Plain literals
 * only, like a product's config.
 */
export default {
  adapter: "adapters/todae.ts",
  paths: {
    source: "fixtures/product",
    features: "fixtures/product/features",
    layouts: "fixtures/product/layouts",
    contentLayouts: "fixtures/product/content-layouts",
    pageTypes: "fixtures/product/page-types",
    catalog: "fixtures/product/catalog/index.ts",
    inputs: "fixtures/product/inputs.ts",
    rules: "fixtures/product/rules.ts",
    styles: "fixtures/product/styles.css",
    app: [],
  },
  flows: [
    {
      states: "fixtures/product/flows/states.ts",
      views: "fixtures/product/flows/views.ts",
      tasks: {
        "approve-vendor-invoice": "fixtures/product/flows/approve-vendor-invoice.ts",
      },
      previews: {
        ready: ["page=collection", "page=detail"],
      },
    },
  ],
} satisfies HarnessConfig;
