/**
 * Each rule is a structural check, a product-owned input, and a review question.
 * The checks fail the build. The questions stay in review notes.
 */
export const uxRules = [
  {
    id: "minimize-interaction-cost",
    structuralCheck: "npm run check:step-budget -- --config products/meridian/harness.config.ts",
    input: "products/meridian/inputs/product.ts#tasks",
    reviewQuestion: "Is an extra step earning its cost?",
  },
  {
    id: "progressive-reveal",
    structuralCheck: "npm run lint:slots -- --config products/meridian/harness.config.ts && npm run check:disclosure -- --config products/meridian/harness.config.ts && npm run check:priority -- --config products/meridian/harness.config.ts",
    input: "products/meridian/inputs/product.ts#priority",
    reviewQuestion: "Is the thing shown first actually what people need first?",
  },
  {
    id: "one-thing-per-page",
    structuralCheck: "npm run check:one-thing -- --config products/meridian/harness.config.ts",
    input: "products/meridian/inputs/product.ts#allowed_page_types",
    reviewQuestion: "Does research support grouping these questions?",
  },
  {
    id: "exhaustive-states",
    structuralCheck: "npm run check:state-coverage -- --config products/meridian/harness.config.ts",
    input: "products/meridian/flows/invoice-approval/states.ts#modeledStates",
    reviewQuestion: "Did we model the states that actually happen?",
  },
  {
    id: "target-size",
    structuralCheck: "npm run check:target-size -- --config products/meridian/harness.config.ts",
    input: "No product exception is recorded. WCAG 2.5.8 spacing may pass an undersized control.",
    reviewQuestion: "Should an important control aim for the stricter 44 CSS px enhanced size?",
  },
] as const;

/** Line items are the one disclosure. Nothing nests under them. */
export const MAX_DISCLOSURE_DEPTH = 1;

/** One disclosure control per page: the shell, what renders on it, and the chrome around it. */
export const MAX_DISCLOSURES_PER_PAGE = 1;

/**
 * One question per page outside a disclosure. A question is a catalog Field.Root.
 * A field on a branch, like the request-changes reason, still counts: the check
 * reads code, not runtime state.
 */
export const MAX_VISIBLE_QUESTIONS = 1;

/** WCAG 2.5.8 Target Size (Minimum). */
export const TARGET_MIN_PX = 24;
