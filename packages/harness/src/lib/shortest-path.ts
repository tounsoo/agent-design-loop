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
 * walks deeper than the budget. Steps that can come in any order, such as two
 * independent settings, reach the same state by many routes. When no state
 * already passed can be reached again from a state, what follows it does not
 * depend on how the route got there, so the search measures it once. It gives
 * up past maxRoutes states measured.
 */
export function measureRoutes<T>(
  start: T,
  edges: readonly TaskEdge<T>[],
  isSuccess: (node: T) => boolean,
  steps: ReadonlySet<string>,
  maxSteps: number,
  maxRoutes = 10_000,
  maxAhead = 2_000,
): RouteMeasure {
  const keyOf = (node: T) => JSON.stringify(node);
  const stepEdges = edges.filter((edge) => steps.has(edge.step));
  const finishes = new Map<string, readonly string[] | null>();
  const finish = (node: T, key: string) => {
    if (!finishes.has(key)) finishes.set(key, shortestPath(node, edges, isSuccess));
    return finishes.get(key) ?? null;
  };
  /** States reachable from a state by steps, or null past maxAhead, when the search measures that state on every route. */
  const ahead = new Map<string, ReadonlySet<string> | null>();
  const reachable = (node: T, key: string) => {
    if (ahead.has(key)) return ahead.get(key) ?? null;
    const seen = new Set<string>();
    const queue: T[] = [node];
    let found: ReadonlySet<string> | null = seen;
    while (queue.length > 0 && found) {
      const current = queue.shift() as T;
      if (isSuccess(current)) continue;
      for (const edge of stepEdges) {
        if (!edge.when(current)) continue;
        const next = edge.apply(current);
        const nextKey = keyOf(next);
        if (seen.has(nextKey)) continue;
        seen.add(nextKey);
        if (seen.size > maxAhead) found = null;
        queue.push(next);
      }
    }
    ahead.set(key, found);
    return found;
  };
  /** Per state measured once: the deepest it was measured at, and its longest suffix. */
  const measured = new Map<string, { depth: number; suffix: readonly string[] | null }>();
  let routes = 0;

  type Walk = { kind: "over"; route: readonly string[] } | { kind: "too-many" } | { kind: "within"; suffix: readonly string[] | null };

  const walk = (node: T, key: string, taken: readonly string[], passed: ReadonlySet<string>): Walk => {
    const known = measured.get(key);
    // No longer route was over budget from deeper, so none is from here.
    if (known && known.depth >= taken.length) return { kind: "within", suffix: known.suffix };
    routes += 1;
    if (routes > maxRoutes) return { kind: "too-many" };
    // No finish from here means no step from here finishes either.
    const rest = isSuccess(node) ? [] : finish(node, key);
    if (!rest) return { kind: "within", suffix: null };
    if (taken.length + rest.length > maxSteps) return { kind: "over", route: [...taken, ...rest] };
    let suffix: readonly string[] = rest;
    if (rest.length > 0) {
      for (const edge of stepEdges) {
        if (!edge.when(node)) continue;
        const next = edge.apply(node);
        const nextKey = keyOf(next);
        if (passed.has(nextKey)) continue;
        const found = walk(next, nextKey, [...taken, edge.step], new Set([...passed, nextKey]));
        if (found.kind !== "within") return found;
        if (found.suffix && found.suffix.length + 1 > suffix.length) suffix = [edge.step, ...found.suffix];
      }
    }
    // Measure once only when the route so far cannot be met again ahead.
    const later = reachable(node, key);
    if (later && ![...passed].some((state) => state !== key && later.has(state))) measured.set(key, { depth: taken.length, suffix });
    return { kind: "within", suffix };
  };

  const startKey = keyOf(start);
  const result = walk(start, startKey, [], new Set([startKey]));
  if (result.kind === "over") return result;
  if (result.kind === "too-many") return { kind: "too-many", limit: maxRoutes };
  return { kind: "within", longest: result.suffix };
}
