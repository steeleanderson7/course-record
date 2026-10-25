"use client";

import { useId, useMemo } from "react";
import { fitStateProjection } from "@/lib/geo/state-projection";
import { clusterByPixelDistance, type ClusterGroup } from "@/lib/geo/clusterPins";
import { BRAND_COLORS } from "@/lib/colors";
import type { CoursePin } from "@/lib/hooks/useTerritoryPins";
import {
  getStateCities,
  getStateWaterFeatures,
  projectPolygon,
  detectEmptyCorner,
  nudgeClearOfClusters,
  placeCityLabel,
  chooseCompassCorner,
  MAP_DETAIL_COLORS,
  PIN_HEAD_OFFSET_Y,
  round2,
  type Obstacle,
  type Corner,
} from "@/lib/geo/stateMapDetail";

const WIDTH = 700;
const HEIGHT = 860;
// Pixel radius (in the 700x860 canvas above) within which nearby courses
// collapse into one cluster badge — tunable; re-clusters from scratch every
// render, so this is also what a future zoom/pan would vary by scale.
const CLUSTER_RADIUS_PX = 26;
const PIN_RADIUS = 8;
const PIN_NUDGE_BUFFER = 6;
const COMPASS_MARGIN = 60;

type ProjectedPin = CoursePin & { xy: [number, number] };

export function StateMap({
  stateName,
  pins,
  currentUserId,
}: {
  stateName: string;
  pins: CoursePin[];
  currentUserId: string;
}) {
  const clipId = useId();
  const grainFilterId = useId();

  const fitted = useMemo(() => fitStateProjection(stateName, WIDTH, HEIGHT), [stateName]);

  const projectedPins = useMemo(() => {
    if (!fitted) return [];
    return pins
      .map((p) => {
        const xy = fitted.projection([p.course.lon, p.course.lat]);
        return xy ? { ...p, xy } : null;
      })
      .filter((p): p is ProjectedPin => p !== null);
  }, [pins, fitted]);

  // Unclaimed courses are never eligible to join or form a cluster — they
  // always render as their own standalone pin, even when their real
  // coordinates would otherwise collapse them into a nearby cluster badge.
  // Claimed pins that come back as singles get the same nudge-clear
  // treatment, since a cluster visually swallowing a standalone pin is the
  // same bug either way.
  const { clusters, singles } = useMemo(() => {
    const claimed = projectedPins.filter((p) => p.holder);
    const unclaimed = projectedPins.filter((p) => !p.holder);
    const result = clusterByPixelDistance(
      claimed.map((p) => ({ xy: p.xy, item: p })),
      CLUSTER_RADIUS_PX
    );
    const standalone = [...result.singles.map((s) => s.item), ...unclaimed];
    const nudged = nudgeClearOfClusters(
      standalone.map((p) => ({ xy: p.xy, item: p })),
      result.clusters.map((c) => ({ xy: c.xy, radius: clusterRadius(c.items.length) })),
      PIN_RADIUS,
      PIN_NUDGE_BUFFER
    );
    return {
      // Rounded for the same reason nudgeClearOfClusters' own output is
      // (see round2's comment) — clusterByPixelDistance's centroid math is
      // plain arithmetic, but it's averaging pin positions that came from
      // geoMercator's Math.tan/Math.log, so the same cross-engine last-bit
      // noise can surface here too.
      clusters: result.clusters.map((c) => ({ ...c, xy: [round2(c.xy[0]), round2(c.xy[1])] as [number, number] })),
      singles: nudged.map((n) => ({ ...n.item, xy: n.xy })),
    };
  }, [projectedPins]);

  const landPathD = fitted ? (fitted.path(fitted.feature) ?? undefined) : undefined;

  const waterPaths = useMemo(() => {
    if (!fitted) return [];
    return getStateWaterFeatures(stateName)
      .map((w) => ({ name: w.name, d: projectPolygon(w.polygon, fitted.projection) }))
      .filter((w): w is { name: string; d: string } => w.d.length > 0);
  }, [fitted, stateName]);

  // City labels are placed in order against a growing obstacle set — pins
  // and clusters go in first (non-negotiable), then each city's own
  // dot+label bbox feeds into the next city's placement, so labels never
  // collide with each other or with map content. This replaces the design
  // handoff's per-city hand-placement step, which doesn't scale to 50
  // states of cities — see placeCityLabel's own comment for the approach.
  const cityMarkers = useMemo(() => {
    if (!fitted) return [];
    const obstacles: Obstacle[] = [
      ...singles.map((p) => ({
        x: p.xy[0] - PIN_RADIUS,
        y: p.xy[1] + PIN_HEAD_OFFSET_Y - PIN_RADIUS,
        w: PIN_RADIUS * 2,
        h: PIN_RADIUS * 2,
      })),
      ...clusters.map((c) => {
        const r = clusterRadius(c.items.length);
        return { x: c.xy[0] - r, y: c.xy[1] - r, w: r * 2, h: r * 2 };
      }),
    ];
    const result: Array<{ name: string; xy: [number, number]; anchor: "start" | "end"; dx: number; dy: number }> = [];
    for (const city of getStateCities(stateName)) {
      const projected = fitted.projection([city.lon, city.lat]);
      if (!projected) continue;
      const xy: [number, number] = [round2(projected[0]), round2(projected[1])];
      const placement = placeCityLabel(xy, city.name, obstacles, WIDTH, HEIGHT);
      result.push({ name: city.name, xy, anchor: placement.anchor, dx: placement.dx, dy: placement.dy });
      obstacles.push(placement.bbox, { x: xy[0] - 4, y: xy[1] - 4, w: 8, h: 8 });
    }
    return result;
  }, [fitted, stateName, singles, clusters]);

  // A faint "surrounding territory" fill always renders behind the land
  // shape (cheap, harmless even for near-rectangular states) — only states
  // whose fitted shape leaves one canvas corner genuinely empty (not the
  // far more common symmetric letterboxed band) get a named-neighbor label
  // in it. See detectEmptyCorner's own comment for why a naive "sample all
  // 4 corners" approach misfires on most states.
  const emptyCorner = useMemo(() => {
    if (!fitted) return null;
    return detectEmptyCorner(stateName, fitted);
  }, [fitted, stateName]);

  const compassCorner = useMemo(() => {
    const occupied: Array<[number, number]> = [
      ...singles.map((p) => p.xy),
      ...clusters.map((c) => c.xy),
      ...cityMarkers.map((c) => c.xy),
    ];
    if (emptyCorner?.neighborName) occupied.push(cornerLabelPosition(emptyCorner.corner, WIDTH, HEIGHT));
    return chooseCompassCorner(occupied, WIDTH, HEIGHT, COMPASS_MARGIN);
  }, [singles, clusters, cityMarkers, emptyCorner]);

  if (!fitted) {
    return <p className="text-sm text-muted-foreground">Map unavailable for {stateName}.</p>;
  }

  // Every tooltip's hover trigger lives on an earlier sibling (the marker),
  // so a single generated <style> block of `#id:hover ~ [data-for="id"]`
  // rules handles all of them — see the design handoff's note on why
  // tooltips must be their own layer, rendered after every marker, rather
  // than nested inside each marker's own <g> (a later marker would
  // otherwise paint over and clip an open tooltip on a dense map).
  const hoverCss = [
    ...singles.map((s) => pinDomId(s.course.id)),
    ...clusters.map((_, i) => clusterDomId(i)),
  ]
    .map((id) => `#${id}:hover ~ .cr-map-tooltip-wrap[data-for="${id}"] .cr-map-tooltip{opacity:1}`)
    .join("");

  const [neighborLabelX, neighborLabelY] = emptyCorner?.neighborName
    ? cornerLabelPosition(emptyCorner.corner, WIDTH, HEIGHT)
    : [0, 0];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ width: "100%", maxWidth: 420, height: "auto", overflow: "visible" }}
      role="img"
      aria-label={`Map of ${stateName} with ${pins.length} tracked golf course${
        pins.length === 1 ? "" : "s"
      }, nearby courses grouped into clusters, color-coded by who holds the course record`}
    >
      <style>{hoverCss}</style>

      <defs>
        <clipPath id={clipId}>
          <path d={landPathD} />
        </clipPath>
        <filter id={grainFilterId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={2} seed={7} result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0" />
        </filter>
      </defs>

      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill={MAP_DETAIL_COLORS.territory} />
      {emptyCorner?.neighborName && (
        <text
          x={neighborLabelX}
          y={neighborLabelY}
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontWeight={600}
          fontSize={12}
          letterSpacing="0.12em"
          fill="#B9AF96"
          style={{ pointerEvents: "none" }}
        >
          {emptyCorner.neighborName.toUpperCase()}
        </text>
      )}

      <path d={landPathD} fill="#EDE7D3" stroke="#C9BFA0" strokeWidth={2.5} />
      <rect
        x={0}
        y={0}
        width={WIDTH}
        height={HEIGHT}
        filter={`url(#${grainFilterId})`}
        clipPath={`url(#${clipId})`}
        style={{ pointerEvents: "none" }}
      />

      {waterPaths.map((w) => (
        <path key={w.name} d={w.d} fill={MAP_DETAIL_COLORS.water} stroke={MAP_DETAIL_COLORS.waterStroke} strokeWidth={1.5} />
      ))}

      {cityMarkers.map((c) => (
        <g
          key={c.name}
          className="cr-map-city"
          transform={`translate(${c.xy[0]},${c.xy[1]})`}
          aria-hidden="true"
          style={{ pointerEvents: "none" }}
        >
          <circle cx={0} cy={0} r={2.6} fill="none" stroke={MAP_DETAIL_COLORS.cityLabel} strokeWidth={1.3} />
          <text
            x={c.dx}
            y={c.dy}
            textAnchor={c.anchor}
            fontFamily="Inter, sans-serif"
            fontWeight={600}
            fontSize={9.5}
            letterSpacing="0.03em"
            fill={MAP_DETAIL_COLORS.cityLabel}
          >
            {c.name.toUpperCase()}
          </text>
        </g>
      ))}

      {singles.map((p) => (
        <CourseMarker key={p.course.id} pin={p} currentUserId={currentUserId} />
      ))}
      {clusters.map((c, i) => (
        <ClusterMarker key={clusterDomId(i)} id={clusterDomId(i)} cluster={c} />
      ))}

      {/* Tooltip layer — after every marker above, per the note above. */}
      {singles.map((p) => (
        <CourseTooltip key={`${p.course.id}-tip`} pin={p} currentUserId={currentUserId} />
      ))}
      {clusters.map((c, i) => (
        <ClusterTooltip key={`${clusterDomId(i)}-tip`} id={clusterDomId(i)} cluster={c} currentUserId={currentUserId} />
      ))}

      <g style={{ pointerEvents: "none" }}>
        <rect x={5} y={5} width={WIDTH - 10} height={HEIGHT - 10} rx={6} fill="none" stroke={BRAND_COLORS.fairway} strokeWidth={2} />
        <rect
          x={10}
          y={10}
          width={WIDTH - 20}
          height={HEIGHT - 20}
          rx={4}
          fill="none"
          stroke={BRAND_COLORS.gold}
          strokeWidth={1}
          strokeOpacity={0.65}
        />
        <CompassRose corner={compassCorner} />
      </g>
    </svg>
  );
}

function pinDomId(courseId: string) {
  return `pin-${courseId}`;
}
function clusterDomId(index: number) {
  return `cluster-${index}`;
}

/** Inset placement for the "surrounding territory" neighbor-state label —
 *  reproduces the design handoff's own Utah placement (548,92 on a 700x860
 *  canvas ≈ 78%/11%) as a formula general enough for any of the 4 corners. */
function cornerLabelPosition(corner: Corner, width: number, height: number): [number, number] {
  const x = corner === "NE" || corner === "SE" ? width * 0.78 : width * 0.22;
  const y = corner === "NE" || corner === "NW" ? height * 0.11 : height * 0.89;
  return [x, y];
}

// Calibrated against the design handoff's 13/15/18px examples for
// 2/3/6-course clusters (sqrt growth, not linear, so radius keeps rising
// gently rather than ballooning once a state has hundreds of courses
// collapsing into one badge — the whole point of clustering at all).
function clusterRadius(count: number): number {
  return Math.min(26, 8 + 5 * Math.sqrt(count - 1));
}

/** No curated micro-region names exist in the data (the reference's "Wasatch
 *  Back" / "St. George Area" labels are hand-authored) — label a cluster by
 *  the city name(s) its members actually share instead of inventing one. */
function clusterLabel(pins: ProjectedPin[]): string {
  const cities = Array.from(new Set(pins.map((p) => p.course.city).filter(Boolean)));
  if (cities.length === 0) return `${pins.length} courses`;
  if (cities.length === 1) return cities[0];
  if (cities.length === 2) return `${cities[0]} & ${cities[1]}`;
  return `${cities.length} areas`;
}

function holderLabel(pin: CoursePin, currentUserId: string): string {
  if (!pin.holder) return "Unclaimed";
  return pin.holder.id === currentUserId ? "You" : pin.holder.name;
}

// Same flag-on-a-pin shape as the national map's .cr-pin (triangle tail +
// circle head, with a little flag-on-a-pole accent for your own courses and
// a white dot for everyone else's) — scaled to 0.8x the national size (was
// 0.5x, then 0.625x, now bumped to land the circle head exactly on the
// handoff's new 8px-radius target), so it still reads as the same icon
// family without ballooning on a map meant to hold hundreds of courses per
// state.
function CourseMarker({ pin, currentUserId }: { pin: ProjectedPin; currentUserId: string }) {
  const color = pin.holder?.color ?? "none";
  const isYou = pin.holder?.id === currentUserId;
  return (
    <a href={`/courses/${pin.course.id}`} id={pinDomId(pin.course.id)} className="cr-map-pin">
      <g transform={`translate(${pin.xy[0]},${pin.xy[1]})`}>
        <g className="cr-map-pin-dot">
          <path
            d="M-4.4,-4.8 L0,1.6 L4.4,-4.8 Z"
            fill={pin.holder ? color : BRAND_COLORS.cream}
            stroke={pin.holder ? undefined : BRAND_COLORS.unclaimed}
            strokeWidth={pin.holder ? 0 : 1.2}
            strokeDasharray={pin.holder ? undefined : "2 2"}
          />
          <circle
            cx={0}
            cy={PIN_HEAD_OFFSET_Y}
            r={PIN_RADIUS}
            fill={pin.holder ? color : BRAND_COLORS.cream}
            stroke={pin.holder ? "#FFFFFF" : BRAND_COLORS.unclaimed}
            strokeWidth={pin.holder ? 1.6 : 1.2}
            strokeDasharray={pin.holder ? undefined : "2 2"}
          />
          {isYou && (
            <>
              <line x1={0} y1={-14.4} x2={0} y2={-4.8} stroke={BRAND_COLORS.ink} strokeWidth={1.28} strokeLinecap="round" />
              <path d="M0,-14.4 L4.4,-12 L0,-10 Z" fill={BRAND_COLORS.ink} />
            </>
          )}
          {pin.holder && !isYou && <circle cx={0} cy={PIN_HEAD_OFFSET_Y} r={2.24} fill="#FFFFFF" />}
        </g>
      </g>
    </a>
  );
}

function ClusterMarker({ id, cluster }: { id: string; cluster: ClusterGroup<ProjectedPin> }) {
  const r = clusterRadius(cluster.items.length);
  return (
    <g id={id} className="cr-map-pin" transform={`translate(${cluster.xy[0]},${cluster.xy[1]})`}>
      <g className="cr-map-pin-dot is-cluster">
        <circle cx={0} cy={0} r={r} fill={BRAND_COLORS.fairway} stroke={BRAND_COLORS.gold} strokeWidth={2} />
        <text x={0} y={4} textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight={700} fontSize={11} fill={BRAND_COLORS.cream}>
          {cluster.items.length}
        </text>
      </g>
    </g>
  );
}

function CourseTooltip({ pin, currentUserId }: { pin: ProjectedPin; currentUserId: string }) {
  const width = 168;
  const height = 58;
  // Icon's circle head tops out at PIN_HEAD_OFFSET_Y - PIN_RADIUS; +8px breathing room above that.
  const gap = -PIN_HEAD_OFFSET_Y + PIN_RADIUS + 8;
  return (
    <g className="cr-map-tooltip-wrap" data-for={pinDomId(pin.course.id)} transform={`translate(${pin.xy[0]},${pin.xy[1]})`}>
      <foreignObject className="cr-map-tooltip" x={-width / 2} y={-(height + gap)} width={width} height={height} style={{ overflow: "visible" }}>
        <div className="cr-tooltip-card" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 1 }}>{pin.course.name}</div>
          <div style={{ color: "#C9D6CB" }}>
            {holderLabel(pin, currentUserId)}
            {pin.holder ? " · Course Record" : ""}
          </div>
          {pin.record && <div style={{ color: "#C9D6CB" }}>Score: {pin.record.score}</div>}
        </div>
      </foreignObject>
    </g>
  );
}

function ClusterTooltip({
  id,
  cluster,
  currentUserId,
}: {
  id: string;
  cluster: ClusterGroup<ProjectedPin>;
  currentUserId: string;
}) {
  const width = 196;
  const rows = cluster.items.slice().sort((a, b) => a.course.name.localeCompare(b.course.name));
  const height = 30 + rows.length * 16;
  const r = clusterRadius(cluster.items.length);
  const gap = r + 10;
  return (
    <g className="cr-map-tooltip-wrap" data-for={id} transform={`translate(${cluster.xy[0]},${cluster.xy[1]})`}>
      <foreignObject className="cr-map-tooltip" x={-width / 2} y={-(height + gap)} width={width} height={height} style={{ overflow: "visible" }}>
        <div className="cr-tooltip-card" style={{ fontSize: 11, lineHeight: 1.55 }}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}>
            {clusterLabel(rows)} · {rows.length} courses
          </div>
          {rows.map((p) => (
            <div key={p.course.id} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span>{p.course.name}</span>
              <span style={{ color: "#C9D6CB", whiteSpace: "nowrap" }}>{holderLabel(p, currentUserId)}</span>
            </div>
          ))}
        </div>
      </foreignObject>
    </g>
  );
}

function CompassRose({ corner }: { corner: Corner }) {
  const cx = corner === "NE" || corner === "SE" ? WIDTH - COMPASS_MARGIN : COMPASS_MARGIN;
  const cy = corner === "NE" || corner === "NW" ? COMPASS_MARGIN : HEIGHT - COMPASS_MARGIN;
  return (
    <g transform={`translate(${cx},${cy})`}>
      <circle cx={0} cy={0} r={22} fill={BRAND_COLORS.cream} stroke={BRAND_COLORS.gold} strokeWidth={1.3} />
      <path d="M0,-15 L4,0 L0,15 L-4,0 Z" fill={BRAND_COLORS.fairway} />
      <path d="M-15,0 L0,4 L15,0 L0,-4 Z" fill={BRAND_COLORS.fairway} fillOpacity={0.55} />
      <text x={0} y={-24} textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight={700} fontSize={9} fill={BRAND_COLORS.fairway}>
        N
      </text>
    </g>
  );
}
