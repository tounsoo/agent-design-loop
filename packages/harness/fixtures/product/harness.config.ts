import type { HarnessConfig } from "../../src/lib/parse-config";

/**
 * The fixture product: a small Todae product that passes every check. Each
 * case under fixtures/ runs the checks on this config with the paths its own
 * case.ts replaces, so a case fails for what it changes. Plain literals
 * only, like a product's config.
 */
export default {
  adapter: "packages/adapter-todae/index.ts",
  paths: {
    source: "packages/harness/fixtures/product",
    features: "packages/harness/fixtures/product/features",
    layouts: "packages/harness/fixtures/product/layouts",
    contentLayouts: "packages/harness/fixtures/product/content-layouts",
    pageTypes: "packages/harness/fixtures/product/page-types",
    catalog: "packages/harness/fixtures/product/catalog/index.ts",
    inputs: "packages/harness/fixtures/product/inputs.ts",
    rules: "packages/harness/fixtures/product/rules.ts",
    styles: "packages/harness/fixtures/product/styles.css",
    app: [],
    web: "packages/harness/fixtures/product",
  },
  shells: {
    primarySlots: { detail: "Primary" },
    collections: { collection: ["Heading", "Description"] },
  },
  flows: [
    {
      states: "packages/harness/fixtures/product/flows/states.ts",
      views: "packages/harness/fixtures/product/flows/views.ts",
      tasks: {
        "approve-vendor-invoice": "packages/harness/fixtures/product/flows/approve-vendor-invoice.ts",
      },
      previews: {
        ready: ["page=collection", "page=detail"],
      },
    },
  ],
} satisfies HarnessConfig;
