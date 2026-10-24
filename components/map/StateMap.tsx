"use client";

import { useMemo } from "react";
import { fitStateProjection } from "@/lib/geo/state-projection";
import { clusterByPixelDistance, type ClusterGroup } from "@/lib/geo/clusterPins";
import { BRAND_COLORS } from "@/lib/colors";
import type { CoursePin } from "@/lib/hooks/useTerritoryPins";

const WIDTH = 700;
const HEIGHT = 860;
// Pixel radius (in the 700x860 canvas above) within which nearby courses
// collapse into one cluster badge — tunable; re-clusters from scratch every
// render, so this is also what a future zoom/pan would vary by scale.
const CLUSTER_RADIUS_PX = 26;

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

  const { clusters, singles } = useMemo(() => {
    const result = clusterByPixelDistance(
      projectedPins.map((p) => ({ xy: p.xy, item: p })),
      CLUSTER_RADIUS_PX
    );
    return { clusters: result.clusters, singles: result.singles.map((s) => s.item) };
  }, [projectedPins]);

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

      <path d={fitted.path(fitted.feature) ?? undefined} fill="#EDE7D3" stroke="#C9BFA0" strokeWidth={2} />

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
    </svg>
  );
}

function pinDomId(courseId: string) {
  return `pin-${courseId}`;
}
function clusterDomId(index: number) {
  return `cluster-${index}`;
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
            cy={-8.8}
            r={8}
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
          {pin.holder && !isYou && <circle cx={0} cy={-8.8} r={2.24} fill="#FFFFFF" />}
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
  // Icon's circle head tops out at cy(-8.8) - r(8) = -16.8; +8px breathing room above that.
  const gap = 16.8 + 8;
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
