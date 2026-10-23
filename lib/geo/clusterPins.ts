export type ClusterInput<T> = { xy: [number, number]; item: T };
export type ClusterGroup<T> = { xy: [number, number]; items: T[] };

/**
 * Greedy radius-based clustering in already-projected pixel space — not a
 * hierarchical/DBSCAN clusterer, deliberately simple: walk the points,
 * seed a cluster at the first not-yet-claimed point, and pull in every
 * other not-yet-claimed point within `radiusPx` of that SEED (not
 * transitively re-expanding from newly-added members), so clusters stay
 * compact instead of chaining across the whole map. A group of exactly one
 * point is returned as a single, not a 1-member cluster.
 *
 * Pure function of whatever points you pass in — recomputes from scratch
 * every call, so it naturally reclusters whenever the input set changes
 * (a friend filter, or a future zoom/pan that reprojects everything).
 */
export function clusterByPixelDistance<T>(
  points: ClusterInput<T>[],
  radiusPx: number
): { clusters: ClusterGroup<T>[]; singles: ClusterInput<T>[] } {
  const remaining = points.slice();
  const clusters: ClusterGroup<T>[] = [];
  const singles: ClusterInput<T>[] = [];

  while (remaining.length > 0) {
    const seed = remaining.shift()!;
    const group: ClusterInput<T>[] = [seed];
    for (let i = remaining.length - 1; i >= 0; i--) {
      const dx = remaining[i].xy[0] - seed.xy[0];
      const dy = remaining[i].xy[1] - seed.xy[1];
      if (Math.sqrt(dx * dx + dy * dy) <= radiusPx) {
        group.push(remaining[i]);
        remaining.splice(i, 1);
      }
    }
    if (group.length === 1) {
      singles.push(group[0]);
    } else {
      const cx = group.reduce((sum, p) => sum + p.xy[0], 0) / group.length;
      const cy = group.reduce((sum, p) => sum + p.xy[1], 0) / group.length;
      clusters.push({ xy: [cx, cy], items: group.map((g) => g.item) });
    }
  }
  return { clusters, singles };
}
