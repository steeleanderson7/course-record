"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { US_PATH, US_STATE_FEATURES } from "@/lib/geo/us-projection";
import { stateNameToSlug } from "@/lib/geo/us-states";
import { BRAND_COLORS } from "@/lib/colors";
import { useTerritoryPins } from "@/lib/hooks/useTerritoryPins";
import { StateMap } from "@/components/map/StateMap";
import { getCoursesInStateAction } from "@/app/actions/courses";
import type { Course, CourseRecord, Friend } from "@/lib/types";

type Props = {
  courses: Course[];
  records: CourseRecord[];
  friends: Friend[];
  currentUserId: string;
  /** When set (state drill-down page), restrict to this state and skip aggregation. */
  focusState?: string;
  /** National Leaderboard's "played" column — same getGroupLifetimeStats
   *  source already used by /leaderboard, keyed by friend id. Only ever
   *  populated on the national (!focusState) map page. */
  roundsPlayedByFriend?: Record<string, number>;
  /** National Leaderboard's "badges" column — same get_player_metrics +
   *  countEarnedBadges pipeline that powers the Badge Collection page, so
   *  this can never drift into a second way of counting badges. */
  badgeCountByFriend?: Record<string, number>;
};

export function TerritoryMapClient({
  courses,
  records,
  friends,
  currentUserId,
  focusState,
  roundsPlayedByFriend,
  badgeCountByFriend,
}: Props) {
  const [activeFriendId, setActiveFriendId] = useState<string | "all">("all");

  // "Show unclaimed courses" — state-view only (see the toggle control
  // below). Fetched once on first enable via a Server Action (not on every
  // page load — most states' full course lists run into the hundreds) and
  // cached in state for the rest of the session; toggling off just hides
  // them again rather than discarding the fetch.
  const [showUnclaimed, setShowUnclaimed] = useState(false);
  const [unclaimedCourses, setUnclaimedCourses] = useState<Course[] | null>(null);
  const [loadingUnclaimed, setLoadingUnclaimed] = useState(false);

  async function handleToggleUnclaimed() {
    const next = !showUnclaimed;
    setShowUnclaimed(next);
    if (next && unclaimedCourses === null && focusState) {
      setLoadingUnclaimed(true);
      try {
        setUnclaimedCourses(await getCoursesInStateAction(focusState));
      } catch {
        setUnclaimedCourses([]);
      } finally {
        setLoadingUnclaimed(false);
      }
    }
  }

  // `courses` is the group's full national tracked-courses list (not
  // pre-filtered to focusState), so dedup has to check against that full
  // list, not a state-scoped subset, or a course the group already tracks
  // could get double-counted as its own separate "unclaimed" pin.
  const mergedCourses = useMemo(() => {
    if (!showUnclaimed || !unclaimedCourses) return courses;
    const existingIds = new Set(courses.map((c) => c.id));
    return [...courses, ...unclaimedCourses.filter((c) => !existingIds.has(c.id))];
  }, [courses, showUnclaimed, unclaimedCourses]);

  const { pins, badgePins, loosePins, countByFriend, unclaimedCount } = useTerritoryPins(
    mergedCourses,
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
                <g className="cr-pin" transform={`translate(${b.xy[0]},${b.xy[1]})`}>
                  <g className="cr-pin-inner is-cluster">
                    <circle cx={0} cy={0} r={19} fill={BRAND_COLORS.fairway} stroke={BRAND_COLORS.gold} strokeWidth={2.5} />
                    <text x={0} y={5} textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight={700} fontSize={14} fill={BRAND_COLORS.cream}>
                      {b.count}
                    </text>
                  </g>
                </g>
              </a>
            ))}

            {loosePins.map((p) => {
              const color = p.holder?.color ?? "none";
              return (
                <a key={p.course.id} href={`/courses/${p.course.id}`}>
                  <g className="cr-pin" transform={`translate(${p.xy[0]},${p.xy[1]})`}>
                    <circle
                      className="cr-pin-inner"
                      cx={0}
                      cy={0}
                      r={8}
                      fill={p.holder ? color : BRAND_COLORS.cream}
                      stroke={p.holder ? "#FFFFFF" : BRAND_COLORS.unclaimed}
                      strokeWidth={1.8}
                      strokeDasharray={p.holder ? undefined : "2.5 2.5"}
                    />
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

  // Both leaderboards sort by countByFriend — the exact same tally already
  // driving the legend's color-swatch counts below the map — so a leaderboard
  // can never disagree with the legend. .sort() is stable (ES2019+), so ties
  // keep `friends`' own insertion order rather than an arbitrary one.
  const leaderboardCard = focusState ? (
    <LeaderboardCard
      title={`${focusState} Leaderboard`}
      subtitle="Ranked by course records held in this state"
      entries={friends
        .map((f) => ({
          friend: f,
          isYou: f.id === currentUserId,
          primary: countByFriend.get(f.id) ?? 0,
        }))
        .sort((a, b) => b.primary - a.primary)}
    />
  ) : (
    <LeaderboardCard
      title="National Leaderboard"
      subtitle="Ranked by total course records held"
      entries={friends
        .map((f) => ({
          friend: f,
          isYou: f.id === currentUserId,
          primary: countByFriend.get(f.id) ?? 0,
          secondary: `${badgeCountByFriend?.[f.id] ?? 0} badges · ${roundsPlayedByFriend?.[f.id] ?? 0} played`,
        }))
        .sort((a, b) => b.primary - a.primary)}
    />
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
      <div className="flex flex-wrap items-center justify-between gap-2.5">
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
        {/* Additive, not mutually-exclusive with the filters above, so it's
            styled as a checkbox rather than another pill in that group —
            state view only, since the national map's state-badge
            aggregation isn't built for hundreds-of-thousands of untracked
            courses nationwide. */}
        {focusState && (
          <UnclaimedToggle checked={showUnclaimed} loading={loadingUnclaimed} onClick={handleToggleUnclaimed} />
        )}
      </div>

      {/* Map + leaderboard side by side — state view keeps its existing
          ~60/40 split (the state SVG is tall/narrow and was wasting vertical
          whitespace stacked full-width); the national map's wide/short SVG
          gets the Dashboard's usual dominant-column ratio instead, since it
          didn't have that problem and previously had no sidebar at all.
          Both wrap to stacked below the breakpoint implied by the basis
          widths. All Courses stays full-width beneath either layout. */}
      <div className="flex flex-wrap items-start gap-7">
        <div className={`min-w-0 ${focusState ? "flex-[3_1_480px]" : "flex-[999_1_560px]"}`}>{mapCard}</div>
        <div className={`min-w-0 ${focusState ? "flex-[2_1_360px]" : "flex-[1_1_300px]"}`}>{leaderboardCard}</div>
      </div>
      {allCoursesCard}
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

function UnclaimedToggle({
  checked,
  loading,
  onClick,
}: {
  checked: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={checked}
      disabled={loading}
      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
        checked ? "border-primary bg-primary/[0.08] text-foreground" : "border-input bg-card text-muted-foreground"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          checked ? "border-primary bg-primary" : "border-input bg-transparent"
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M1.5,5 L4,7.5 L8.5,2" stroke="white" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {loading ? "Loading unclaimed courses…" : "Show unclaimed courses"}
    </button>
  );
}

type LeaderboardEntry = {
  friend: Friend;
  isYou: boolean;
  primary: number;
  /** National Leaderboard's "N badges · M played" line; state leaderboard omits it. */
  secondary?: string;
};

function LeaderboardCard({
  title,
  subtitle,
  entries,
}: {
  title: string;
  subtitle: string;
  entries: LeaderboardEntry[];
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-card p-6">
      <p className="font-heading text-lg font-bold">{title}</p>
      <p className="mb-2 text-xs text-muted-foreground">{subtitle}</p>
      {entries.map((entry, i) => (
        <div
          key={entry.friend.id}
          className={`flex items-center gap-2.5 border-b border-border/60 py-2.5 last:border-b-0 ${
            entry.isYou ? "-mx-2.5 rounded-md bg-primary/[0.08] px-2.5" : ""
          }`}
        >
          <span
            className="font-heading w-3.5 flex-none text-[15px] font-bold"
            style={{ color: entry.isYou ? BRAND_COLORS.gold : BRAND_COLORS.muted }}
          >
            {i + 1}
          </span>
          <span
            className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[11px] font-bold"
            style={{ backgroundColor: entry.friend.color, color: entry.isYou ? BRAND_COLORS.ink : "#fff" }}
          >
            {entry.friend.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-sm ${entry.isYou ? "font-bold" : "font-semibold"}`}>
              {entry.friend.name}
              {entry.isYou ? " (you)" : ""}
            </span>
            {entry.secondary && (
              <span className="block truncate text-[11px] text-muted-foreground">{entry.secondary}</span>
            )}
          </span>
          <span className="flex-none text-[15px] font-bold">{entry.primary}</span>
        </div>
      ))}
    </div>
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
