import type { SupabaseClient } from "@supabase/supabase-js";
import { findState } from "@/lib/geo/us-projection";
import { countEarnedBadges } from "@/lib/badgeCatalog";

/** Thin wrapper around get_player_metrics, returning a plain {metric: value}
 *  map instead of rows — the shape every caller actually wants (the badges
 *  page, the dashboard teaser, and the before/after snapshots the
 *  badge-earned celebration diffs against in app/actions/rounds.ts). */
export async function getPlayerMetricsMap(
  supabase: SupabaseClient,
  userId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc("get_player_metrics", { p_target_user_id: userId });
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((r: { metric: string; value: number }) => [r.metric, r.value]));
}

/** Total earned-badge count for every member of a group, in parallel (fine
 *  at friend-group scale, same posture as getGroupLifetimeStats). Built
 *  directly on getPlayerMetricsMap + countEarnedBadges — the exact pipeline
 *  that powers the Badge Collection page — so the Territory Map's National
 *  Leaderboard card can never drift into a second, separate way of counting
 *  badges. */
export async function getGroupBadgeCounts(
  supabase: SupabaseClient,
  memberIds: string[]
): Promise<Record<string, number>> {
  const entries = await Promise.all(
    memberIds.map(async (id) => [id, countEarnedBadges(await getPlayerMetricsMap(supabase, id))] as const)
  );
  return Object.fromEntries(entries);
}

/**
 * Recomputes every "recompute from scratch" badge metric for one user from
 * their own rounds+courses history, and writes the result via
 * upsert_player_metrics (see supabase/migrations/0011_player_metrics.sql).
 *
 * Deliberately NOT an RPC: states_played needs findState()'s real
 * point-in-polygon lookup (lib/geo/us-projection.ts), which only runs in
 * Node, not SQL. Safe to run under the subject's own session rather than a
 * security-definer function — get_lifetime_stats avoids findState()
 * specifically because a *cross-group viewer* calling it would leak
 * row-level course detail outside groups they're in; that concern doesn't
 * apply here since this only ever runs for a user computing their own
 * stats from their own (RLS-visible) rows.
 *
 * Every value here is an absolute set, not an increment — safe to call
 * after every round, and after any event that might change a user's own
 * course/record history.
 */
export async function recomputeOwnMetrics(supabase: SupabaseClient, userId: string): Promise<void> {
  const [{ data: rounds, error: roundsError }, { count: recordsHeld, error: recordsError }] = await Promise.all([
    supabase
      .from("rounds")
      .select("date_played, birdies, eagles_plus, aces, courses(id, country_code, lat, lon, is_marquee, is_tpc, is_notable_architect)")
      .eq("user_id", userId),
    supabase
      .from("course_group_records")
      .select("course_id", { count: "exact", head: true })
      .eq("holder_user_id", userId),
  ]);
  if (roundsError) throw roundsError;
  if (recordsError) throw recordsError;

  const rows = rounds ?? [];

  const states = new Set<string>();
  const countries = new Set<string>();
  const top100Courses = new Set<string>();
  const tpcCourses = new Set<string>();
  const architectCourses = new Set<string>();
  let birdies = 0;
  let eaglesPlus = 0;
  let aces = 0;
  const monthsPlayed = new Set<string>();

  for (const r of rows) {
    const course = r.courses as unknown as {
      id: string;
      country_code: string | null;
      lat: number;
      lon: number;
      is_marquee: boolean;
      is_tpc: boolean;
      is_notable_architect: boolean;
    } | null;

    if (course) {
      const state = findState(course.lon, course.lat);
      if (state) states.add(state.name);
      if (course.country_code) countries.add(course.country_code);
      if (course.is_marquee) top100Courses.add(course.id);
      if (course.is_tpc) tpcCourses.add(course.id);
      if (course.is_notable_architect) architectCourses.add(course.id);
    }

    birdies += r.birdies ?? 0;
    eaglesPlus += r.eagles_plus ?? 0;
    aces += r.aces ?? 0;

    // "YYYY-MM" key for the streak calculation below.
    monthsPlayed.add(r.date_played.slice(0, 7));
  }

  const metrics: Record<string, number> = {
    rounds_played: rows.length,
    states_played: states.size,
    countries_played: countries.size,
    top_100_courses_played: top100Courses.size,
    tpc_courses_played: tpcCourses.size,
    architect_courses_played: architectCourses.size,
    birdies_lifetime: birdies,
    eagles_plus_lifetime: eaglesPlus,
    holes_in_one_lifetime: aces,
    active_month_streak: computeActiveMonthStreak(monthsPlayed),
    records_held_concurrent: recordsHeld ?? 0,
  };

  const { error } = await supabase.rpc("upsert_player_metrics", { p_metrics: metrics });
  if (error) throw error;
}

/**
 * Consecutive calendar months with at least one round, counting backward
 * from the most recent month a round was actually logged in — NOT from
 * today's real-world calendar month. There's no scheduled job here to tick
 * a streak down the moment an empty month starts without a new round being
 * logged (this only runs on-write, via recomputeOwnMetrics), so a player
 * who stops logging keeps their last streak value frozen rather than it
 * silently decaying. Known v1 limitation, documented rather than solved —
 * a monthly cron recompute is the natural v2 fix, matching the project's
 * existing style of flagging "good enough for now" simplifications (see
 * get_lifetime_stats' states_played comment).
 */
function computeActiveMonthStreak(monthsPlayed: Set<string>): number {
  if (monthsPlayed.size === 0) return 0;
  const mostRecent = [...monthsPlayed].sort().at(-1)!;

  let streak = 0;
  let [year, month] = mostRecent.split("-").map(Number);
  while (monthsPlayed.has(`${year}-${String(month).padStart(2, "0")}`)) {
    streak++;
    month--;
    if (month === 0) {
      month = 12;
      year--;
    }
  }
  return streak;
}
