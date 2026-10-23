"use client";

import { useState } from "react";
import Link from "next/link";
import { US_PATH, US_STATE_FEATURES } from "@/lib/geo/us-projection";
import { stateNameToSlug } from "@/lib/geo/us-states";
import { BRAND_COLORS } from "@/lib/colors";
import { useTerritoryPins } from "@/lib/hooks/useTerritoryPins";
import { StateMap } from "@/components/map/StateMap";
import type { Course, CourseRecord, Friend } from "@/lib/types";

type Props = {
  courses: Course[];
  records: CourseRecord[];
  friends: Friend[];
  currentUserId: string;
  /** When set (state drill-down page), restrict to this state and skip aggregation. */
  focusState?: string;
};

export function TerritoryMapClient({ courses, records, friends, currentUserId, focusState }: Props) {
  const [activeFriendId, setActiveFriendId] = useState<string | "all">("all");

  const { pins, badgePins, loosePins, countByFriend, unclaimedCount } = useTerritoryPins(
    courses,
    records,
    friends,
    { focusState, activeFriendId }
  );

  const mapCard = (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-7">
      <p className="text-[13px] text-muted-foreground">
        {focusState
          ? "Hover a pin for details · nearby courses group into a cluster · tap to see who holds the record"
          : "National overview · each state is lightly tinted · tap a state (or a pin) to drill in"}
      </p>
      <div className="flex justify-center overflow-x-auto">
        {focusState ? (
          <StateMap stateName={focusState} pins={loosePins} currentUserId={currentUserId} />
        ) : (
          <svg
            viewBox="0 0 960 600"
            style={{ width: "100%", maxWidth: 860, height: "auto" }}
            role="img"
            aria-label="Map of courses color-coded by who holds the record"
          >
            {US_STATE_FEATURES.map((f) => (
              <a key={f.properties.name} href={`/map/${stateNameToSlug(f.properties.name)}`}>
                <path
                  d={US_PATH(f) ?? undefined}
                  fill="#F1ECDC"
                  stroke="#C9BFA0"
                  strokeWidth={1}
                  data-state={f.properties.name}
                />
              </a>
            ))}

            {badgePins.map((b) => (
              <a key={b.stateName} href={`/map/${stateNameToSlug(b.stateName)}`}>
                <g transform={`translate(${b.xy[0]},${b.xy[1]})`}>
                  <circle cx={0} cy={-15} r={19} fill={BRAND_COLORS.fairway} stroke={BRAND_COLORS.gold} strokeWidth={2.5} />
                  <text x={0} y={-11} textAnchor="middle" fontWeight={700} fontSize={13} fill={BRAND_COLORS.cream}>
                    {b.count}
                  </text>
                  <path d="M-6,3 L0,13 L6,3 Z" fill={BRAND_COLORS.fairway} stroke={BRAND_COLORS.gold} strokeWidth={2.5} />
                </g>
              </a>
            ))}

            {loosePins.map((p) => {
              const color = p.holder?.color ?? "none";
              const isYou = p.holder?.id === currentUserId;
              return (
                <a key={p.course.id} href={`/courses/${p.course.id}`}>
                  <g className="cr-pin" transform={`translate(${p.xy[0]},${p.xy[1]})`}>
                    <g className="cr-pin-inner">
                      <path d="M-5.5,-6 L0,2 L5.5,-6 Z" fill={p.holder ? color : BRAND_COLORS.cream} stroke={p.holder ? undefined : BRAND_COLORS.unclaimed} strokeWidth={p.holder ? 0 : 1.5} strokeDasharray={p.holder ? undefined : "2.5 2.5"} />
                      <circle cx={0} cy={-11} r={10} fill={p.holder ? color : BRAND_COLORS.cream} stroke={p.holder ? "#FFFFFF" : BRAND_COLORS.unclaimed} strokeWidth={p.holder ? 2 : 1.5} strokeDasharray={p.holder ? undefined : "2.5 2.5"} />
                      {isYou && (
                        <>
                          <line x1={0} y1={-18} x2={0} y2={-6} stroke={BRAND_COLORS.ink} strokeWidth={1.6} strokeLinecap="round" />
                          <path d="M0,-18 L5.5,-15 L0,-12.5 Z" fill={BRAND_COLORS.ink} />
                        </>
                      )}
                      {p.holder && !isYou && <circle cx={0} cy={-11} r={2.8} fill="#FFFFFF" />}
                    </g>
                  </g>
                </a>
              );
            })}
          </svg>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-5 border-t border-border pt-4">
        {friends.map((f) => (
          <LegendDot key={f.id} color={f.color} label={`${f.id === currentUserId ? "You" : f.name} · ${countByFriend.get(f.id) ?? 0}`} />
        ))}
        {unclaimedCount > 0 && <LegendDot dashed label={`Unclaimed · ${unclaimedCount}`} />}
      </div>
    </div>
  );

  const allCoursesCard = (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-7">
      <p className="font-heading mb-3.5 text-[22px] font-bold">All Courses</p>
      <div className="flex items-center gap-3 border-b border-border py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <span className="flex-[2]">Course</span>
        <span className="flex-1">Holder</span>
        <span className="flex-1 text-right">Record</span>
      </div>
      {pins
        .slice()
        .sort((a, b) => a.course.name.localeCompare(b.course.name))
        .map((p) => (
          <Link
            key={p.course.id}
            href={`/courses/${p.course.id}`}
            className="course-row -mx-2 items-center gap-3 border-b border-border/60 px-2 py-3 text-left last:border-b-0"
          >
            <span className="flex-[2] text-sm">
              {p.course.name}{" "}
              <span className="text-muted-foreground">
                · {[p.course.city, p.state?.abbr].filter(Boolean).join(", ")}
              </span>
            </span>
            <span className="flex flex-1 items-center gap-2 text-[13px]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: p.holder ? p.holder.color : "transparent",
                  border: p.holder ? undefined : `2px dashed ${BRAND_COLORS.unclaimed}`,
                }}
              />
              {p.holder ? (p.holder.id === currentUserId ? "You" : p.holder.name) : "Unclaimed"}
            </span>
            <span className="flex-1 text-right text-[13px]">{p.record?.score ?? "—"}</span>
          </Link>
        ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-center gap-2.5">
        <FilterPill active={activeFriendId === "all"} onClick={() => setActiveFriendId("all")}>
          All
        </FilterPill>
        {friends.map((f) => (
          <FilterPill key={f.id} active={activeFriendId === f.id} onClick={() => setActiveFriendId(f.id)}>
            {f.id === currentUserId ? "Mine" : f.name}
          </FilterPill>
        ))}
      </div>

      {focusState ? (
        // State view: map and course list side by side — map gets the
        // larger ~60% share since the state SVG is tall/narrow and was
        // wasting a lot of vertical whitespace stacked full-width above an
        // equally full-width table; pairing them lets the list fill that
        // space instead. Wraps to stacked below the breakpoint implied by
        // the basis widths, same as the Dashboard/CourseDetail two-column
        // sections elsewhere in the app.
        <div className="flex flex-wrap items-start gap-7">
          <div className="min-w-0 flex-[3_1_480px]">{mapCard}</div>
          <div className="min-w-0 flex-[2_1_360px]">{allCoursesCard}</div>
        </div>
      ) : (
        <>
          {mapCard}
          {allCoursesCard}
        </>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-[13px] font-semibold ${
        active ? "bg-sidebar text-sidebar-foreground" : "border border-input bg-card text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function LegendDot({ color, dashed, label }: { color?: string; dashed?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-3.5 w-3.5 shrink-0 rounded"
        style={
          dashed
            ? { border: `2px dashed ${BRAND_COLORS.unclaimed}` }
            : { backgroundColor: color }
        }
      />
      <span className="text-[13px]">{label}</span>
    </div>
  );
}
