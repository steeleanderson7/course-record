"use client";

import Link from "next/link";
import { US_PATH, US_STATE_FEATURES } from "@/lib/geo/us-projection";
import { BRAND_COLORS } from "@/lib/colors";
import { useTerritoryPins } from "@/lib/hooks/useTerritoryPins";
import type { Course, CourseRecord, Friend } from "@/lib/types";

type Props = {
  courses: Course[];
  records: CourseRecord[];
  friends: Friend[];
  currentUserId: string;
};

/**
 * A real (not decorative) preview of the territory map for the dashboard —
 * same geo projection and aggregation logic as the full /map page, just
 * smaller and non-interactive beyond "click to go to the full map."
 */
export function DashboardTerritoryPreview({ courses, records, friends, currentUserId }: Props) {
  const { badgePins, loosePins, countByFriend, unclaimedCount } = useTerritoryPins(
    courses,
    records,
    friends
  );

  return (
    <div className="flex flex-col gap-4">
      <Link href="/map" className="block overflow-hidden rounded-lg border border-border">
        <svg viewBox="0 0 960 600" style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Preview of your territory map">
          {US_STATE_FEATURES.map((f) => (
            <path key={f.properties.name} d={US_PATH(f) ?? undefined} fill="#F1ECDC" stroke="#C9BFA0" strokeWidth={1} />
          ))}
          {badgePins.map((b) => (
            <g key={b.stateName} transform={`translate(${b.xy[0]},${b.xy[1]})`}>
              <circle cx={0} cy={-15} r={19} fill={BRAND_COLORS.fairway} stroke={BRAND_COLORS.gold} strokeWidth={2.5} />
              <text x={0} y={-11} textAnchor="middle" fontWeight={700} fontSize={13} fill={BRAND_COLORS.cream}>
                {b.count}
              </text>
              <path d="M-6,3 L0,13 L6,3 Z" fill={BRAND_COLORS.fairway} stroke={BRAND_COLORS.gold} strokeWidth={2.5} />
            </g>
          ))}
          {loosePins.map((p) => {
            const color = p.holder?.color ?? "none";
            const isYou = p.holder?.id === currentUserId;
            return (
              <g key={p.course.id} transform={`translate(${p.xy[0]},${p.xy[1]})`}>
                <circle
                  cx={0}
                  cy={-11}
                  r={9}
                  fill={p.holder ? color : BRAND_COLORS.cream}
                  stroke={p.holder ? "#FFFFFF" : BRAND_COLORS.unclaimed}
                  strokeWidth={p.holder ? 1.5 : 1.25}
                  strokeDasharray={p.holder ? undefined : "2 2"}
                />
                {isYou && <circle cx={0} cy={-11} r={2.4} fill={BRAND_COLORS.ink} />}
              </g>
            );
          })}
        </svg>
      </Link>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {friends.map((f) => (
          <LegendDot
            key={f.id}
            color={f.color}
            label={`${f.id === currentUserId ? "You" : f.name} — ${countByFriend.get(f.id) ?? 0}`}
          />
        ))}
        {unclaimedCount > 0 && <LegendDot dashed label={`Unclaimed — ${unclaimedCount}`} />}
      </div>
    </div>
  );
}

function LegendDot({ color, dashed, label }: { color?: string; dashed?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-3.5 w-3.5 shrink-0 rounded"
        style={dashed ? { border: `2px dashed ${BRAND_COLORS.unclaimed}` } : { backgroundColor: color }}
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
