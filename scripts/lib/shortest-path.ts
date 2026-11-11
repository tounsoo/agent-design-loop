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
