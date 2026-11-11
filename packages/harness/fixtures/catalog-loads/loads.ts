/** Legal: a feature file re-exports from the product's catalog and loads it lazily. Only the design system itself is off limits. */
export { Button } from "../product/catalog";

export const loadCatalog = () => import("../product/catalog");
