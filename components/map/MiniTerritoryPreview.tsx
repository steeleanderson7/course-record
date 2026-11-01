"use client";

import { US_PATH, US_STATE_FEATURES } from "@/lib/geo/us-projection";
import { BRAND_COLORS } from "@/lib/colors";
import { useTerritoryPins } from "@/lib/hooks/useTerritoryPins";
import type { Course, CourseRecord, Friend } from "@/lib/types";

/**
 * A small, non-interactive glance at the national map for the Dashboard's
 * mobile "Your Territory" card — reuses the same `useTerritoryPins`
 * aggregation the full map uses (so dots/colors can never disagree with
 * it), just rendered tiny with no legend/hover/tap, matching the mobile
 * mockup's compact territory-card treatment. The full interactive map is
 * one tap away via the card's own "View full map" link, so this never
 * needs to be more than a glanceable visual.
 */
export function MiniTerritoryPreview({
  courses,
  records,
  friends,
}: {
  courses: Course[];
  records: CourseRecord[];
  friends: Friend[];
}) {
  const { badgePins, loosePins } = useTerritoryPins(courses, records, friends);

  return (
    <svg
      viewBox="0 0 960 600"
      style={{ width: 72, height: 44, flex: "0 0 72px" }}
      role="img"
      aria-hidden="true"
      className="rounded-md bg-background"
    >
      {US_STATE_FEATURES.map((f) => (
        <path key={f.properties.name} d={US_PATH(f) ?? undefined} fill="#EDE7D3" stroke="#C9BFA0" strokeWidth={1} />
      ))}
      {badgePins.map((b) => (
        <circle key={b.stateName} cx={b.xy[0]} cy={b.xy[1]} r={10} fill={BRAND_COLORS.fairway} stroke={BRAND_COLORS.gold} strokeWidth={2} />
      ))}
      {loosePins.map((p) => (
        <circle
          key={p.course.id}
          cx={p.xy[0]}
          cy={p.xy[1]}
          r={6}
          fill={p.holder ? p.holder.color : BRAND_COLORS.cream}
          stroke={p.holder ? "#FFFFFF" : BRAND_COLORS.unclaimed}
          strokeWidth={1.2}
        />
      ))}
    </svg>
  );
}
