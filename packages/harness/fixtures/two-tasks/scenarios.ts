import type { Scenario, Scenarios } from "../../src/lib/scenario-read";

/** One scenario per modeled state, and reminded on its detail page, as the product's own data. */
export const scenarios = {
  loading: { state: "loading" },
  ready: { state: "ready" },
  "reminded-detail": { state: "reminded", page: "detail" },
  archived: { state: "archived" },
} satisfies Scenarios<string, Scenario & { readonly page?: string }>;
