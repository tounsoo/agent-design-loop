export type TaskEdge<T> = {
  readonly step: string;
  readonly when: (node: T) => boolean;
  readonly apply: (node: T) => T;
};

export function shortestPath<T>(
  start: T,
  edges: readonly TaskEdge<T>[],
  isSuccess: (node: T) => boolean,
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
