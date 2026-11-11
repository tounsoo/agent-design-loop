/**
 * The harness's path search, which check:step-budget measures every task
 * with. A task graph module's taskEdges are TaskEdge values. A product may
 * import this too, to measure its own graph in its tests, as Meridian does.
 */
export type TaskEdge<T> = {
  readonly step: string;
  readonly when: (node: T) => boolean;
  readonly apply: (node: T) => T;
};

export function shortestPath<T>(
  start: T,
  edges: readonly TaskEdge<T>[],
  isSuccess: (node: T) => boolean,
  maxStates = 100_000,
): readonly string[] | null {
  const keyOf = (node: T) => JSON.stringify(node);
  const seen = new Set<string>([keyOf(start)]);
  const queue: { node: T; path: string[] }[] = [{ node: start, path: [] }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    if (isSuccess(current.node)) return current.path;
    for (const edge of edges) {
      if (!edge.when(current.node)) continue;
      const next = edge.apply(current.node);
      const key = keyOf(next);
      if (seen.has(key)) continue;
      seen.add(key);
      // A reducer with unbounded state (a counter, free text) would never end the search.
      if (seen.size > maxStates) return null;
      queue.push({ node: next, path: [...current.path, edge.step] });
    }
  }

  return null;
}

/**
 * Edges from a reducer: every event is a step, and an event the reducer
 * ignores leads back to a state already seen.
 */
export function eventEdges<S, E extends { readonly type: string }>(
  events: readonly E[],
  reduce: (state: S, event: E) => S,
): TaskEdge<S>[] {
  return events.map((event) => ({ step: event.type, when: () => true, apply: (state) => reduce(state, event) }));
}

/** What measureRoutes found: the longest route within budget, or the first one over it. */
export type RouteMeasure =
  | { readonly kind: "within"; readonly longest: readonly string[] | null }
  | { readonly kind: "over"; readonly route: readonly string[] }
  | { readonly kind: "too-many"; readonly limit: number };

/**
 * Every route to success, not only the shortest. A route takes steps, edges
 * whose step is in `steps`, in any order the edges allow and never back to a
 * state it has already passed, then finishes the shortest way any edge allows.
 * An edge outside `steps` (an optional look, a setting with a default, Back)
 * is not a step a person chooses, so it only counts when the finish needs it.
 *
 * The search stops a route as soon as its length passes maxSteps, so it never
 * walks deeper than the budget, and gives up past maxRoutes routes.
 */
export function measureRoutes<T>(
  start: T,
  edges: readonly TaskEdge<T>[],
  isSuccess: (node: T) => boolean,
  steps: ReadonlySet<string>,
  maxSteps: number,
  maxRoutes = 10_000,
): RouteMeasure {
  const keyOf = (node: T) => JSON.stringify(node);
  const finishes = new Map<string, readonly string[] | null>();
  const finish = (node: T, key: string) => {
    if (!finishes.has(key)) finishes.set(key, shortestPath(node, edges, isSuccess));
    return finishes.get(key) ?? null;
  };
  let routes = 0;
  let longest: readonly string[] | null = null;

  const walk = (node: T, key: string, taken: readonly string[], passed: ReadonlySet<string>): RouteMeasure | null => {
    routes += 1;
    if (routes > maxRoutes) return { kind: "too-many", limit: maxRoutes };
    // No finish from here means no step from here finishes either.
    const rest = isSuccess(node) ? [] : finish(node, key);
    if (!rest) return null;
    const route = [...taken, ...rest];
    if (route.length > maxSteps) return { kind: "over", route };
    if (!longest || route.length > longest.length) longest = route;
    if (rest.length === 0) return null;
    for (const edge of edges) {
      if (!steps.has(edge.step) || !edge.when(node)) continue;
      const next = edge.apply(node);
      const nextKey = keyOf(next);
      if (passed.has(nextKey)) continue;
      const found = walk(next, nextKey, [...taken, edge.step], new Set([...passed, nextKey]));
      if (found) return found;
    }
    return null;
  };

  const startKey = keyOf(start);
  return walk(start, startKey, [], new Set([startKey])) ?? { kind: "within", longest };
}
