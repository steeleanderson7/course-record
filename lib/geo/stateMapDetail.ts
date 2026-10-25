import { geoContains, geoCentroid, type GeoPermissibleObjects, type GeoProjection } from "d3-geo";
import { STATE_NEIGHBORS, US_STATE_FEATURES } from "@/lib/geo/us-projection";
import type { FittedStateProjection } from "@/lib/geo/state-projection";
import { clusterByPixelDistance } from "@/lib/geo/clusterPins";
import { US_STATE_CITIES, type CityRef } from "@/data/usStateCities";
import { getStateWaterFeatures as lookupStateWaterFeatures } from "@/data/usWaterFeatures";

export type { CityRef } from "@/data/usStateCities";
export type { WaterFeature } from "@/data/usWaterFeatures";

/**
 * Map-decoration-only colors (water fill/stroke, the "surrounding
 * territory" tint, the muted city-label color) — kept local here rather
 * than added to `lib/colors.ts`'s `BRAND_COLORS`, following the convention
 * `StateMap.tsx` already uses for its own land fill/stroke (hardcoded
 * inline, not routed through the shared app palette); a repo-wide grep
 * found no reuse case for these outside the map.
 */
export const MAP_DETAIL_COLORS = {
  water: "#C3D6D2",
  waterStroke: "#9FB8B3",
  territory: "#F2EEE2",
  cityLabel: "#8B8068",
};

/** A pin's rendered circle head sits this far above its logical xy in
 *  `CourseMarker` (StateMap.tsx) — shared here so the nudge math below can
 *  never drift out of sync with where the pin is actually drawn. */
export const PIN_HEAD_OFFSET_Y = -8.8;

/**
 * Rounds a projected pixel coordinate to hundredths before it's written
 * into an SVG attribute string. An SVG coordinate has no legitimate need
 * for 15 significant digits of precision, and discarding the noise below
 * that threshold is what actually fixes a real (if invisible) hydration
 * mismatch discovered while building this: `geoMercator`'s internal
 * `Math.tan`/`Math.log` calls aren't guaranteed bit-identical across two
 * separate JS engine executions (Node during SSR vs. the browser during
 * hydration), so a pin's projected xy can differ from the server-rendered
 * HTML by roughly 1 part in 10^13 — never visible, but enough for React to
 * log a dev-only "server/client didn't match" warning on the affected
 * `transform` attribute. Rounding both sides to the same 2 decimals makes
 * them produce identical strings regardless of that last-bit noise. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function getStateCities(stateName: string): CityRef[] {
  return US_STATE_CITIES[stateName] ?? [];
}

export const getStateWaterFeatures = lookupStateWaterFeatures;

/** Projects a closed ring of real [lon, lat] points through a state's own
 *  fitted projection into an SVG path `d` string. Points that fall outside
 *  the projection's domain are dropped — fine for a feature that partially
 *  overlaps a neighboring state's canvas; it just clips at the edge. */
export function projectPolygon(points: [number, number][], projection: GeoProjection): string {
  const projected = points.map((p) => projection(p)).filter((p): p is [number, number] => p !== null);
  if (projected.length < 3) return "";
  return projected.map((p, i) => `${i === 0 ? "M" : "L"}${round2(p[0])},${round2(p[1])}`).join("") + "Z";
}

// ---------------------------------------------------------------------------
// Empty-corner / neighbor-label detection
// ---------------------------------------------------------------------------

export type Corner = "NE" | "NW" | "SE" | "SW";
export type EmptyCornerInfo = { corner: Corner; neighborName: string | null };

const CORNER_SAMPLE_GRID = 4;
const CORNER_SAMPLE_INSET_FRACTION = 0.18;
const CORNER_OUTSIDE_THRESHOLD = 0.5;
const CORNER_RUNNER_UP_MAX_RATIO = 0.6;

const CORNER_INFO: Record<Corner, { atRight: boolean; atBottom: boolean; vector: [number, number] }> = {
  NE: { atRight: true, atBottom: false, vector: [1, -1] },
  NW: { atRight: false, atBottom: false, vector: [-1, -1] },
  SE: { atRight: true, atBottom: true, vector: [1, 1] },
  SW: { atRight: false, atBottom: true, vector: [-1, 1] },
};

/**
 * Detects whether a state's fitted shape leaves one corner of its OWN
 * bounding box meaningfully uncovered by its real outline (Utah's NE notch,
 * ceded to Wyoming by an old survey correction, is the motivating case).
 *
 * Sampling has to be inset from the state's own bbox corners, not the
 * canvas corners — verified empirically while building this: `fitExtent`
 * always leaves some padding between the bbox and the canvas edge (at
 * minimum the fixed `PAD_PX` margin, plus more on whichever axis doesn't
 * bind), and sampling near the *canvas* corner mostly just measures that
 * ordinary padding gap, not an actual notch — it read every state,
 * including perfect rectangles like Wyoming, as having an "empty" corner.
 * Sampling a small grid inset from the bbox's own corner instead gives a
 * clean signal: ~0% outside for a corner solidly inside the state's real
 * shape, ~100% for a corner the shape doesn't actually reach (confirmed
 * against real states: Utah → NE=100%, other three ≈0%; Wyoming/Colorado,
 * genuinely rectangular → all four ≈0%).
 *
 * Returns null when no single corner is clearly the empty one: the winning
 * corner's outside-fraction must clear an absolute threshold, AND the
 * runner-up must be well below it — multi-notch states (Michigan's two
 * peninsulas, Florida's panhandle, Maine) correctly produce several
 * high-scoring corners and get no label rather than an arbitrary pick.
 */
export function detectEmptyCorner(stateName: string, fitted: FittedStateProjection): EmptyCornerInfo | null {
  const invert = fitted.projection.invert;
  if (!invert) return null;

  const bounds = fitted.path.bounds(fitted.feature as GeoPermissibleObjects) as [[number, number], [number, number]];
  const [[x0, y0], [x1, y1]] = bounds;
  const bboxWidth = x1 - x0;
  const bboxHeight = y1 - y0;

  const scores: Record<Corner, number> = { NE: 0, NW: 0, SE: 0, SW: 0 };
  for (const corner of Object.keys(CORNER_INFO) as Corner[]) {
    const info = CORNER_INFO[corner];
    const insetX = bboxWidth * CORNER_SAMPLE_INSET_FRACTION;
    const insetY = bboxHeight * CORNER_SAMPLE_INSET_FRACTION;
    const cornerX = info.atRight ? x1 : x0;
    const cornerY = info.atBottom ? y1 : y0;
    let outside = 0;
    let total = 0;
    for (let i = 0; i < CORNER_SAMPLE_GRID; i++) {
      for (let j = 0; j < CORNER_SAMPLE_GRID; j++) {
        const sx = cornerX + (info.atRight ? -1 : 1) * ((insetX * (i + 0.5)) / CORNER_SAMPLE_GRID);
        const sy = cornerY + (info.atBottom ? -1 : 1) * ((insetY * (j + 0.5)) / CORNER_SAMPLE_GRID);
        const lonLat = invert([sx, sy]);
        if (!lonLat) continue;
        total++;
        if (!geoContains(fitted.feature as GeoPermissibleObjects, lonLat)) outside++;
      }
    }
    scores[corner] = total > 0 ? outside / total : 0;
  }

  const ranked = (Object.entries(scores) as [Corner, number][]).sort((a, b) => b[1] - a[1]);
  const [winnerCorner, winnerScore] = ranked[0];
  const [, runnerUpScore] = ranked[1];
  if (winnerScore < CORNER_OUTSIDE_THRESHOLD) return null;
  if (runnerUpScore > winnerScore * CORNER_RUNNER_UP_MAX_RATIO) return null;

  return { corner: winnerCorner, neighborName: pickNeighborForCorner(stateName, fitted, winnerCorner) };
}

/** Picks whichever REAL bordering state (via `STATE_NEIGHBORS`, derived
 *  from shared TopoJSON arcs — not curated) best matches a corner's
 *  direction: project each neighbor's real spherical centroid through this
 *  state's own fitted projection, and compare its direction from the focus
 *  state's own projected centroid against the corner's canonical unit
 *  vector via dot product (avoids angle-wrapping edge cases entirely). */
function pickNeighborForCorner(stateName: string, fitted: FittedStateProjection, corner: Corner): string | null {
  const neighborNames = STATE_NEIGHBORS[stateName] ?? [];
  if (neighborNames.length === 0) return null;

  const focusCentroidXY = fitted.projection(geoCentroid(fitted.feature as GeoPermissibleObjects));
  if (!focusCentroidXY) return null;

  const target = CORNER_INFO[corner].vector;
  const targetMag = Math.hypot(target[0], target[1]);

  let best: string | null = null;
  let bestDot = -Infinity;
  for (const name of neighborNames) {
    const neighborFeature = US_STATE_FEATURES.find((f) => f.properties.name === name);
    if (!neighborFeature) continue;
    const neighborXY = fitted.projection(geoCentroid(neighborFeature as GeoPermissibleObjects));
    if (!neighborXY) continue;
    const dx = neighborXY[0] - focusCentroidXY[0];
    const dy = neighborXY[1] - focusCentroidXY[1];
    const mag = Math.hypot(dx, dy);
    if (mag === 0) continue;
    const dot = (dx / mag) * (target[0] / targetMag) + (dy / mag) * (target[1] / targetMag);
    if (dot > bestDot) {
      bestDot = dot;
      best = name;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Nudge standalone pins clear of cluster badges (and of each other)
// ---------------------------------------------------------------------------

const COINCIDENCE_EPSILON_PX = 2;
const MAX_CORRECTION_PASSES = 4;

export type NudgeSingle<T> = { xy: [number, number]; item: T };
export type NudgeCluster = { xy: [number, number]; radius: number };

/**
 * Pushes any standalone pin (claimed or unclaimed — the visual bug is the
 * same either way) clear of a nearby cluster badge's edge, so an unclaimed
 * course can never visually disappear under a cluster even when its real
 * coordinates are pixel-coincident with the cluster's centroid.
 *
 * Three phases, in order:
 * 1. De-stack singles that are themselves coincident with each other
 *    (reuses `clusterByPixelDistance` at a tiny radius purely to find these
 *    groups) by spreading them evenly around their shared point — otherwise
 *    a naive "zero vector → fixed fallback angle" rule would just re-stack
 *    every coincident pin onto the same new spot, reproducing the bug.
 * 2. Nudge each (now-separated) pin radially outward from any cluster it
 *    overlaps, processed cluster-by-cluster so a pin near two clusters
 *    clears both.
 * 3. A small bounded re-check (≤4 passes) against all clusters and all
 *    other singles, since nudging clear of one cluster can land on top of
 *    another cluster or another pin — accepts a residual overlap in a
 *    pathological layout rather than looping indefinitely.
 */
export function nudgeClearOfClusters<T>(
  singles: NudgeSingle<T>[],
  clusters: NudgeCluster[],
  pinRadius: number,
  buffer: number
): NudgeSingle<T>[] {
  if (singles.length === 0) return singles;

  // Clearance is measured from the pin's actual visible circle head, not
  // its stored xy (see PIN_HEAD_OFFSET_Y) — otherwise every nudge target is
  // off by that offset.
  const visual: [number, number][] = singles.map((s) => [s.xy[0], s.xy[1] + PIN_HEAD_OFFSET_Y]);

  const coincidence = clusterByPixelDistance(
    visual.map((xy, i) => ({ xy, item: i })),
    COINCIDENCE_EPSILON_PX
  );
  const positions = visual.map((p) => [p[0], p[1]] as [number, number]);
  for (const group of coincidence.clusters) {
    const n = group.items.length;
    const [cx, cy] = group.xy;
    const spreadRadius = pinRadius + buffer / 2;
    group.items.forEach((i, k) => {
      const angle = (k * 2 * Math.PI) / n;
      positions[i] = [cx + spreadRadius * Math.cos(angle), cy + spreadRadius * Math.sin(angle)];
    });
  }

  const nudgeAgainstClusters = () => {
    let violated = false;
    for (let i = 0; i < positions.length; i++) {
      for (const cluster of clusters) {
        const target = cluster.radius + pinRadius + buffer;
        const dx = positions[i][0] - cluster.xy[0];
        const dy = positions[i][1] - cluster.xy[1];
        const dist = Math.hypot(dx, dy);
        if (dist < target) {
          violated = true;
          const angle = dist === 0 ? 0 : Math.atan2(dy, dx);
          positions[i] = [cluster.xy[0] + target * Math.cos(angle), cluster.xy[1] + target * Math.sin(angle)];
        }
      }
    }
    return violated;
  };

  const nudgeAgainstSingles = () => {
    let violated = false;
    const target = pinRadius * 2 + buffer;
    for (let i = 0; i < positions.length; i++) {
      for (let j = 0; j < positions.length; j++) {
        if (i === j) continue;
        const dx = positions[i][0] - positions[j][0];
        const dy = positions[i][1] - positions[j][1];
        const dist = Math.hypot(dx, dy);
        if (dist < target && dist > 0) {
          violated = true;
          const angle = Math.atan2(dy, dx);
          positions[i] = [positions[j][0] + target * Math.cos(angle), positions[j][1] + target * Math.sin(angle)];
        }
      }
    }
    return violated;
  };

  nudgeAgainstClusters();
  for (let pass = 0; pass < MAX_CORRECTION_PASSES; pass++) {
    const a = nudgeAgainstClusters();
    const b = nudgeAgainstSingles();
    if (!a && !b) break;
  }

  return singles.map((s, i) => ({
    xy: [round2(positions[i][0]), round2(positions[i][1] - PIN_HEAD_OFFSET_Y)] as [number, number],
    item: s.item,
  }));
}

// ---------------------------------------------------------------------------
// City label collision avoidance
// ---------------------------------------------------------------------------

export type Obstacle = { x: number; y: number; w: number; h: number };
type LabelCandidate = { anchor: "start" | "end"; dx: number; dy: number };

const LABEL_CANDIDATES: LabelCandidate[] = [
  { anchor: "start", dx: 11, dy: 4 }, // E
  { anchor: "end", dx: -11, dy: 4 }, // W
  { anchor: "start", dx: 11, dy: -9 }, // NE
  { anchor: "end", dx: -11, dy: -9 }, // NW
  { anchor: "start", dx: 11, dy: 15 }, // SE
  { anchor: "end", dx: -11, dy: 15 }, // SW
  { anchor: "end", dx: -12, dy: -5 }, // N
  { anchor: "start", dx: 12, dy: 18 }, // S
];

const LABEL_CHAR_WIDTH_PX = 5.5;
const LABEL_HEIGHT_PX = 10;

function estimateLabelBBox(cityXY: [number, number], upperName: string, candidate: LabelCandidate): Obstacle {
  const width = upperName.length * LABEL_CHAR_WIDTH_PX;
  const x = candidate.anchor === "start" ? cityXY[0] + candidate.dx : cityXY[0] + candidate.dx - width;
  return { x, y: cityXY[1] + candidate.dy - LABEL_HEIGHT_PX * 0.7, w: width, h: LABEL_HEIGHT_PX };
}

/** Negative when overlapping; otherwise the gap between the two boxes. */
function clearance(a: Obstacle, b: Obstacle): number {
  const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), 0);
  const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h), 0);
  if (dx === 0 && dy === 0) return -1;
  return Math.hypot(dx, dy);
}

/**
 * Picks a label offset/anchor for a city dot that doesn't collide with
 * anything already placed — the generalized replacement for the design
 * handoff's "hand-placed per city" step, which doesn't scale to 50 states
 * worth of cities. Tries 8 compass-direction candidates, estimates each
 * one's real text bounding box (point-distance alone under-detects
 * collisions between very different label lengths, e.g. "SALT LAKE CITY"
 * vs. "ST. GEORGE"), and picks the candidate with the most clearance from
 * every obstacle — falling back to the least-bad candidate if all 8
 * collide, rather than erroring.
 */
export function placeCityLabel(
  cityXY: [number, number],
  name: string,
  obstacles: Obstacle[],
  width: number,
  height: number
): { anchor: "start" | "end"; dx: number; dy: number; bbox: Obstacle } {
  const upperName = name.toUpperCase();
  const edgeMargin = 6;

  let best: { candidate: LabelCandidate; bbox: Obstacle; score: number } | null = null;
  for (const candidate of LABEL_CANDIDATES) {
    const bbox = estimateLabelBBox(cityXY, upperName, candidate);
    const outOfBounds =
      bbox.x < edgeMargin ||
      bbox.x + bbox.w > width - edgeMargin ||
      bbox.y < edgeMargin ||
      bbox.y + bbox.h > height - edgeMargin;
    const worstClearance = obstacles.length === 0 ? Infinity : Math.min(...obstacles.map((o) => clearance(bbox, o)));
    const score = outOfBounds ? worstClearance - 1000 : worstClearance;
    if (!best || score > best.score) best = { candidate, bbox, score };
  }

  const chosen = best!.candidate;
  return { anchor: chosen.anchor, dx: chosen.dx, dy: chosen.dy, bbox: best!.bbox };
}

// ---------------------------------------------------------------------------
// Compass rose placement
// ---------------------------------------------------------------------------

const COMPASS_CORNER_FRACTION: Record<Corner, [number, number]> = {
  SE: [1, 1],
  SW: [0, 1],
  NE: [1, 0],
  NW: [0, 0],
};
// SE first — matches the reference's own default bottom-right placement;
// only loses that slot if another corner is clearly less crowded.
const COMPASS_PREFERENCE_ORDER: Corner[] = ["SE", "SW", "NE", "NW"];

/** Picks whichever frame corner has the most clearance from already-placed
 *  pins/clusters/cities, defaulting to the reference's own bottom-right
 *  placement on a tie. */
export function chooseCompassCorner(
  occupied: Array<[number, number]>,
  width: number,
  height: number,
  margin: number
): Corner {
  let best: Corner = "SE";
  let bestScore = -Infinity;
  for (const corner of COMPASS_PREFERENCE_ORDER) {
    const [fx, fy] = COMPASS_CORNER_FRACTION[corner];
    const cx = fx === 0 ? margin : width - margin;
    const cy = fy === 0 ? margin : height - margin;
    const nearestDist =
      occupied.length === 0 ? Infinity : Math.min(...occupied.map(([ox, oy]) => Math.hypot(ox - cx, oy - cy)));
    // Tiny fixed bonus for earlier (preferred) corners so a true tie still
    // favors the reference's own default rather than an arbitrary pick.
    const preferenceBonus = (COMPASS_PREFERENCE_ORDER.length - COMPASS_PREFERENCE_ORDER.indexOf(corner)) * 0.01;
    const score = nearestDist + preferenceBonus;
    if (score > bestScore) {
      bestScore = score;
      best = corner;
    }
  }
  return best;
}
