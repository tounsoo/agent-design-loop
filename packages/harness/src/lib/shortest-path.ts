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

/**
 * A state's key, the same for states that hold the same values: object keys
 * are sorted, and a Set or Map is read as its sorted entries, which plain
 * JSON.stringify would write as {}.
 */
export function stateKey(node: unknown): string {
  const plain = (value: unknown): unknown => {
    if (value instanceof Map) return { "<Map>": [...value].map(([key, entry]) => [plain(key), plain(entry)]).sort(byKey) };
    if (value instanceof Set) return { "<Set>": [...value].map(plain).sort(byKey) };
    if (Array.isArray(value)) return value.map(plain);
    if (typeof value === "object" && value !== null) {
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, plain((value as Record<string, unknown>)[key])]),
      );
    }
    return value;
  };
  const byKey = (a: unknown, b: unknown) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1);
  return JSON.stringify(plain(node)) ?? "undefined";
}

/** A search's result, with how many states it looked at. */
type Search = ({ readonly kind: "found"; readonly path: readonly string[] } | { readonly kind: "none" } | { readonly kind: "capped" }) & {
  readonly seen: number;
};

function search<T>(start: T, edges: readonly TaskEdge<T>[], isSuccess: (node: T) => boolean, maxStates: number): Search {
  const seen = new Set<string>([stateKey(start)]);
  // Each entry keeps the step that reached it and its parent's index, so no path is copied.
  const queue: { node: T; step: string; parent: number }[] = [{ node: start, step: "", parent: -1 }];
  const pathTo = (index: number) => {
    const path: string[] = [];
    for (let at = index; at > 0; at = queue[at]?.parent ?? 0) path.unshift(queue[at]?.step ?? "");
    return path;
  };

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (!current) break;
    if (isSuccess(current.node)) return { kind: "found", path: pathTo(index), seen: seen.size };
    for (const edge of edges) {
      if (!edge.when(current.node)) continue;
      const next = edge.apply(current.node);
      const key = stateKey(next);
      if (seen.has(key)) continue;
      seen.add(key);
      // A reducer with unbounded state (a counter, free text) would never end the search.
      if (seen.size > maxStates) return { kind: "capped", seen: seen.size };
      queue.push({ node: next, step: edge.step, parent: index });
    }
  }

  return { kind: "none", seen: seen.size };
}

export function shortestPath<T>(
  start: T,
  edges: readonly TaskEdge<T>[],
  isSuccess: (node: T) => boolean,
  maxStates = 100_000,
): readonly string[] | null {
  const found = search(start, edges, isSuccess, maxStates);
  return found.kind === "found" ? found.path : null;
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
  | { readonly kind: "too-many"; readonly limit: string };

/**
 * Every route to success, not only the shortest. A route takes steps, edges
 * whose step is in `steps`, in any order the edges allow, each step at most
 * once and never back to a state it has already passed, then finishes the
 * shortest way any edge allows. Taking a step twice, such as selecting a
 * second row, is a detour like any other.
 * An edge outside `steps` (an optional look, a setting with a default, Back)
 * is not a step a person chooses, so it only counts when the finish needs it.
 *
 * The search stops a route as soon as its length passes maxSteps, so it never
 * walks deeper than the budget. Steps that can come in any order, such as two
 * independent settings, reach the same state by many routes. When no state
 * already passed can be reached again from a state, what follows it does not
 * depend on how the route got there, so the search measures it once. It gives
 * up past maxRoutes states measured, or when finding the shortest finishes
 * would look at more than maxFinishStates states in all, as a reducer with a
 * counter and a dead end can.
 */
export function measureRoutes<T>(
  start: T,
  edges: readonly TaskEdge<T>[],
  isSuccess: (node: T) => boolean,
  steps: ReadonlySet<string>,
  maxSteps: number,
  maxRoutes = 10_000,
  maxFinishStates = 200_000,
  maxAhead = 2_000,
): RouteMeasure {
  const keyOf = stateKey;
  const stepEdges = edges.filter((edge) => steps.has(edge.step));
  const finishes = new Map<string, Search>();
  let finishStates = 0;
  const finish = (node: T, key: string): Search => {
    const known = finishes.get(key);
    if (known) return known;
    const found = search(node, edges, isSuccess, maxFinishStates - finishStates);
    finishStates += found.seen;
    finishes.set(key, found);
    return found;
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
  /** A state and the steps taken to reach it: what follows depends on both. */
  const measureKey = (key: string, taken: readonly string[]) => `${key}|${JSON.stringify([...new Set(taken)].sort())}`;
  let routes = 0;

  type Walk = { kind: "over"; route: readonly string[] } | { kind: "too-many"; limit: string } | { kind: "within"; suffix: readonly string[] | null };

  const walk = (node: T, key: string, taken: readonly string[], passed: ReadonlySet<string>): Walk => {
    const known = measured.get(measureKey(key, taken));
    // No longer route was over budget from deeper, so none is from here.
    if (known && known.depth >= taken.length) return { kind: "within", suffix: known.suffix };
    routes += 1;
    if (routes > maxRoutes) return { kind: "too-many", limit: `${maxRoutes} states` };
    const finished: Search = isSuccess(node) ? { kind: "found", path: [], seen: 0 } : finish(node, key);
    if (finished.kind === "capped") return { kind: "too-many", limit: `${maxFinishStates} states searched for a finish` };
    // No finish from here means no step from here finishes either.
    if (finished.kind === "none") return { kind: "within", suffix: null };
    const rest = finished.path;
    if (taken.length + rest.length > maxSteps) return { kind: "over", route: [...taken, ...rest] };
    let suffix: readonly string[] = rest;
    if (rest.length > 0) {
      for (const edge of stepEdges) {
        if (taken.includes(edge.step) || !edge.when(node)) continue;
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
    if (later && ![...passed].some((state) => state !== key && later.has(state))) measured.set(measureKey(key, taken), { depth: taken.length, suffix });
    return { kind: "within", suffix };
  };

  const startKey = keyOf(start);
  const result = walk(start, startKey, [], new Set([startKey]));
  if (result.kind === "over") return result;
  if (result.kind === "too-many") return result;
  return { kind: "within", longest: result.suffix };
}
