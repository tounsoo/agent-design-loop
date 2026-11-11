/**
 * What a product imports from the harness: the config and adapter types its
 * harness.config.ts and adapter satisfy, and the path search its task graphs
 * use. Only types from the adapter module, because loading it runs a check's
 * config read.
 */
export type { FlowConfig, HarnessConfig, ShellRules } from "./src/lib/parse-config";
export type { DesignSystemAdapter } from "./src/lib/adapter";
export { eventEdges, measureRoutes, shortestPath, stateKey, type RouteMeasure, type TaskEdge } from "./src/lib/shortest-path";
