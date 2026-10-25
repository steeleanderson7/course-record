import type { SupabaseClient } from "@supabase/supabase-js";
import { colorForUser, BRAND_COLORS } from "@/lib/colors";
import { daysBetween } from "@/lib/relativeTime";
import { findState, stateGeoBounds } from "@/lib/geo/us-projection";
import type { Course, CourseRecord, Friend, Round } from "@/lib/types";

export async function getUserGroups(supabase: SupabaseClient, userId: string, activeGroupId: string) {
  const { data, error } = await supabase
    .from("group_members")
    .select("joined_at, groups(id, name, invite_code)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((m) => {
    const group = m.groups as unknown as { id: string; name: string; invite_code: string };
    return { ...group, isActive: group.id === activeGroupId };
  });
}

export type GroupSummary = Awaited<ReturnType<typeof getUserGroups>>[number] & {
  members: Friend[];
  memberCount: number;
  yourRank: number;
  yourRecords: number;
};

/** Per-group card data for the Groups page — member avatars, your rank, your record count in each group you belong to. */
export async function getUserGroupsDetailed(
  supabase: SupabaseClient,
  userId: string,
  activeGroupId: string
): Promise<GroupSummary[]> {
  const groups = await getUserGroups(supabase, userId, activeGroupId);

  return Promise.all(
    groups.map(async (g) => {
      const [members, { records }] = await Promise.all([
        getGroupMembers(supabase, g.id, userId),
        getGroupRecords(supabase, g.id),
      ]);
      const countByUser = new Map<string, number>();
      for (const r of records) countByUser.set(r.holderUserId, (countByUser.get(r.holderUserId) ?? 0) + 1);
      const ranked = members
        .map((m) => ({ id: m.id, count: countByUser.get(m.id) ?? 0 }))
        .sort((a, b) => b.count - a.count);
      return {
        ...g,
        members,
        memberCount: members.length,
        yourRank: ranked.findIndex((r) => r.id === userId) + 1,
        yourRecords: countByUser.get(userId) ?? 0,
      };
    })
  );
}

export async function getGroupMembersDetailed(
  supabase: SupabaseClient,
  groupId: string,
  currentUserId: string,
  createdBy: string
) {
  const [{ data, error }, { records }] = await Promise.all([
    supabase
      .from("group_members")
      .select("user_id, joined_at, profiles(display_name)")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true }),
    getGroupRecords(supabase, groupId),
  ]);
  if (error) throw error;

  const recordCountByUser = new Map<string, number>();
  for (const r of records) {
    recordCountByUser.set(r.holderUserId, (recordCountByUser.get(r.holderUserId) ?? 0) + 1);
  }

  return (data ?? []).map((m) => {
    const profile = m.profiles as unknown as { display_name: string } | null;
    return {
      id: m.user_id,
      name: profile?.display_name ?? "Unknown",
      color: colorForUser(m.user_id, currentUserId),
      joinedAt: m.joined_at as string,
      isCreator: m.user_id === createdBy,
      recordsHeld: recordCountByUser.get(m.user_id) ?? 0,
    };
  });
}

export async function getGroupMembers(
  supabase: SupabaseClient,
  groupId: string,
  currentUserId: string
): Promise<Friend[]> {
  const { data, error } = await supabase
    .from("group_members")
    .select("user_id, profiles(id, display_name)")
    .eq("group_id", groupId);
  if (error) throw error;

  return (data ?? []).map((m) => {
    const profile = m.profiles as unknown as { display_name: string } | null;
    return {
      id: m.user_id,
      name: profile?.display_name ?? "Unknown",
      color: colorForUser(m.user_id, currentUserId),
    };
  });
}

/**
 * course_group_records is a view, not a base table — PostgREST's FK-based
 * embedding isn't reliable against views, so courses are fetched in a
 * second query and joined here instead of embedding courses(...) directly.
 */
export async function getGroupRecords(
  supabase: SupabaseClient,
  groupId: string
): Promise<{ records: CourseRecord[]; courses: Course[] }> {
  const { data: rows, error } = await supabase
    .from("course_group_records")
    .select("course_id, holder_user_id, score, date_played")
    .eq("group_id", groupId);
  if (error) throw error;
  if (!rows || rows.length === 0) return { records: [], courses: [] };

  const courseIds = rows.map((r) => r.course_id);
  const { data: courseRows, error: courseError } = await supabase
    .from("courses")
    .select("id, name, city, country_code, lat, lon, par")
    .in("id", courseIds);
  if (courseError) throw courseError;

  const records: CourseRecord[] = rows.map((r) => ({
    courseId: r.course_id,
    holderUserId: r.holder_user_id,
    score: r.score,
    datePlayed: r.date_played,
  }));
  const courses: Course[] = (courseRows ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    city: c.city ?? "",
    country: c.country_code ?? "",
    lat: c.lat,
    lon: c.lon,
    par: c.par,
  }));

  return { records, courses };
}

/**
 * Every real course in a state, regardless of whether the group has ever
 * logged a round there — backs the "show unclaimed courses" map toggle.
 * Deliberately separate from getGroupRecords above (which only ever
 * returns courses with an existing record): this is the broader, group-
 * agnostic catalog a group hasn't necessarily touched yet.
 *
 * Two-stage filter, matching the pattern app/map/[state]/page.tsx already
 * uses for the tracked-courses list: a cheap geographic bounding-box
 * pre-filter via the courses_in_bbox RPC (hits the existing courses.geom
 * GiST index, see supabase/migrations/0012_courses_in_bbox.sql), then a
 * precise findState() point-in-polygon refine in JS to drop any stray rows
 * the (deliberately padded, to avoid false negatives) bbox over-includes
 * from a neighboring state.
 */
export async function getCoursesInState(supabase: SupabaseClient, stateName: string): Promise<Course[]> {
  const bounds = stateGeoBounds(stateName);
  if (!bounds) return [];
  const [[minLon, minLat], [maxLon, maxLat]] = bounds;

  const { data, error } = await supabase.rpc("courses_in_bbox", {
    p_min_lon: minLon,
    p_min_lat: minLat,
    p_max_lon: maxLon,
    p_max_lat: maxLat,
  });
  if (error) throw error;

  return (data ?? [])
    .filter((c: { lat: number; lon: number }) => findState(c.lon, c.lat)?.name === stateName)
    .map(
      (c: { id: string; name: string; city: string | null; country_code: string | null; lat: number; lon: number; par: number | null }) => ({
        id: c.id,
        name: c.name,
        city: c.city ?? "",
        country: c.country_code ?? "",
        lat: c.lat,
        lon: c.lon,
        par: c.par,
      })
    );
}

export type BestRound = { userId: string; score: number; par: number | null; courseName: string; datePlayed: string };

/** Each member's single best (lowest) 18-hole round ever logged in this group — for the leaderboard's "Best Round Ever" card. */
export async function getGroupBestRounds(
  supabase: SupabaseClient,
  groupId: string
): Promise<Map<string, BestRound>> {
  const { data, error } = await supabase
    .from("rounds")
    .select("user_id, score, date_played, courses(name, par)")
    .eq("group_id", groupId)
    .eq("holes_played", 18)
    .order("score", { ascending: true });
  if (error) throw error;

  const best = new Map<string, BestRound>();
  for (const r of data ?? []) {
    if (best.has(r.user_id)) continue; // already sorted ascending — first seen per user is their best
    const course = r.courses as unknown as { name: string; par: number | null } | null;
    best.set(r.user_id, {
      userId: r.user_id,
      score: r.score,
      par: course?.par ?? null,
      courseName: course?.name ?? "a course",
      datePlayed: r.date_played,
    });
  }
  return best;
}

export async function getGroupRounds(
  supabase: SupabaseClient,
  groupId: string
): Promise<Round[]> {
  const { data, error } = await supabase
    .from("rounds")
    .select("id, course_id, user_id, score, holes_played, date_played")
    .eq("group_id", groupId)
    .order("date_played", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    courseId: r.course_id,
    userId: r.user_id,
    score: r.score,
    holesPlayed: r.holes_played as 9 | 18,
    datePlayed: r.date_played,
  }));
}

export async function getGroupLedger(
  supabase: SupabaseClient,
  groupId: string,
  limit = 50
) {
  const { data, error } = await supabase
    .from("rounds")
    .select(
      "id, score, holes_played, date_played, user_id, course_id, profiles(display_name), courses(name, city, country_code)"
    )
    .eq("group_id", groupId)
    .order("date_played", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export type ActivityItem = {
  id: string;
  actorUserId: string;
  actorName: string;
  courseId: string;
  courseName: string;
  score: number;
  par: number | null;
  datePlayed: string;
  createdAt: string;
  kind: "claimed" | "broke-your-record" | "reclaimed-from" | "took-from" | "logged";
  previousHolderName: string | null;
};

/**
 * Classifies every round as a feed event (claimed / broke-your-record /
 * reclaimed-from / took-from / plain logged) by replaying the group's
 * rounds in actual logging order and tracking who held each course's
 * record at each point in time. `course_group_records` only knows *today's*
 * holder, not this history, so this has to be computed here rather than
 * read off a view.
 */
export async function getGroupActivityFeed(
  supabase: SupabaseClient,
  groupId: string,
  viewerUserId: string,
  limit = 20
): Promise<ActivityItem[]> {
  const { data, error } = await supabase
    .from("rounds")
    .select(
      "id, score, holes_played, date_played, created_at, user_id, course_id, profiles(display_name), courses(name, par)"
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const nameByUser = new Map<string, string>();
  const bestByCourse = new Map<string, { score: number; userId: string }>();
  const items: ActivityItem[] = [];

  for (const r of data ?? []) {
    const profile = r.profiles as unknown as { display_name: string } | null;
    const course = r.courses as unknown as { name: string; par: number | null } | null;
    const actorName = profile?.display_name ?? "Someone";
    nameByUser.set(r.user_id, actorName);

    let kind: ActivityItem["kind"] = "logged";
    let previousHolderName: string | null = null;

    if (r.holes_played === 18) {
      const current = bestByCourse.get(r.course_id);
      if (!current || r.score < current.score) {
        if (!current) {
          kind = "claimed";
        } else if (current.userId !== r.user_id) {
          previousHolderName = nameByUser.get(current.userId) ?? "someone";
          kind = current.userId === viewerUserId ? "broke-your-record"
            : r.user_id === viewerUserId ? "reclaimed-from"
            : "took-from";
        }
        // else: same person improving their own existing record — treat as a plain log, not a "claim" event.
        bestByCourse.set(r.course_id, { score: r.score, userId: r.user_id });
      }
    }

    items.push({
      id: r.id,
      actorUserId: r.user_id,
      actorName,
      courseId: r.course_id,
      courseName: course?.name ?? "a course",
      score: r.score,
      par: course?.par ?? null,
      datePlayed: r.date_played,
      createdAt: r.created_at,
      kind,
      previousHolderName,
    });
  }

  return items.reverse().slice(0, limit);
}

export async function getCourseDetail(
  supabase: SupabaseClient,
  courseId: string,
  groupId: string
) {
  const [{ data: course, error: courseError }, { data: record }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, name, city, country_code, lat, lon, par")
      .eq("id", courseId)
      .single(),
    supabase
      .from("course_group_records")
      .select("holder_user_id, score, date_played")
      .eq("course_id", courseId)
      .eq("group_id", groupId)
      .maybeSingle(),
  ]);

  if (courseError) throw courseError;

  return { course, record };
}

export type CourseActivityItem = {
  id: string;
  actorUserId: string;
  actorName: string;
  actorColor: string;
  score: number;
  holesPlayed: 9 | 18;
  datePlayed: string;
  createdAt: string;
  /** Was this round, at the moment it was logged, a new course record? */
  isRecordSetting: boolean;
  /** Is this the record that's still standing today (vs. later superseded)? */
  isCurrentRecord: boolean;
  /** Only set for a superseded record-setting round: days until the next one beat it. */
  heldForDays: number | null;
};

/**
 * Every round ever logged at a course in this group, in reverse-chronological
 * order, with record-setting rounds tagged — not just the current holder's
 * round, every transition. Mirrors getGroupActivityFeed's approach (replay
 * rounds in actual logging order, track the running best) but scoped to one
 * course, plus a second pass to compute how long each superseded record
 * stood before it was broken (`heldForDays`), which getGroupActivityFeed
 * doesn't need since it only cares about the moment a record changed hands,
 * not its lifespan.
 */
export async function getCourseActivityLog(
  supabase: SupabaseClient,
  groupId: string,
  courseId: string,
  friends: Friend[]
): Promise<CourseActivityItem[]> {
  const { data, error } = await supabase
    .from("rounds")
    .select("id, score, holes_played, date_played, created_at, user_id, profiles(display_name)")
    .eq("group_id", groupId)
    .eq("course_id", courseId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const nameByUser = new Map(friends.map((f) => [f.id, f.name]));
  const colorByUser = new Map(friends.map((f) => [f.id, f.color]));

  // Pass 1: replay in logged order, tagging each round as record-setting if
  // it beat the running best at the time (18-hole rounds only, same rule
  // course_group_records uses), and remember the sequence of transitions.
  const base: Array<Omit<CourseActivityItem, "isCurrentRecord" | "heldForDays">> = [];
  const transitionIndexes: number[] = [];
  let best: number | null = null;

  for (const r of data ?? []) {
    const profile = r.profiles as unknown as { display_name: string } | null;
    const isRecordSetting = r.holes_played === 18 && (best === null || r.score < best);
    if (isRecordSetting) best = r.score;

    base.push({
      id: r.id,
      actorUserId: r.user_id,
      actorName: nameByUser.get(r.user_id) ?? profile?.display_name ?? "Someone",
      actorColor: colorByUser.get(r.user_id) ?? BRAND_COLORS.muted,
      score: r.score,
      holesPlayed: r.holes_played as 9 | 18,
      datePlayed: r.date_played,
      createdAt: r.created_at,
      isRecordSetting,
    });
    if (isRecordSetting) transitionIndexes.push(base.length - 1);
  }

  // Pass 2: for each record-setting round, "held for" = days until the NEXT
  // transition's date_played. The last transition is still current — no
  // held-for line for it (the spotlight card above already shows that).
  const heldForByIndex = new Map<number, number | null>();
  transitionIndexes.forEach((idx, i) => {
    const isLast = i === transitionIndexes.length - 1;
    heldForByIndex.set(
      idx,
      isLast ? null : daysBetween(base[idx].datePlayed, base[transitionIndexes[i + 1]].datePlayed)
    );
  });
  const currentTransitionIndex = transitionIndexes.at(-1) ?? null;

  return base
    .map((item, i) => ({
      ...item,
      isCurrentRecord: i === currentTransitionIndex,
      heldForDays: item.isRecordSetting ? (heldForByIndex.get(i) ?? null) : null,
    }))
    .reverse();
}

export type GlobalRankingRow = {
  userId: string;
  displayName: string;
  score: number;
  datePlayed: string;
  rank: number;
};

/**
 * The one intentionally-public cross-group query in the app — see
 * supabase/migrations/0009_global_course_ranking.sql for the privacy
 * reasoning. Returns every user's best 18-hole round at this course,
 * ranked, regardless of which group(s) they logged it in.
 */
export async function getCourseGlobalRanking(
  supabase: SupabaseClient,
  courseId: string
): Promise<GlobalRankingRow[]> {
  const { data, error } = await supabase.rpc("get_course_global_ranking", { p_course_id: courseId });
  if (error) throw error;
  type RawRow = { user_id: string; display_name: string; score: number; date_played: string; rnk: number };
  return ((data ?? []) as RawRow[]).map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    score: r.score,
    datePlayed: r.date_played,
    rank: r.rnk,
  }));
}

export async function getProfileStats(
  supabase: SupabaseClient,
  groupId: string,
  targetUserId: string
) {
  const [{ data: profile, error: profileError }, { records }, { data: rounds, error: roundsError }] =
    await Promise.all([
      supabase.from("profiles").select("id, display_name").eq("id", targetUserId).single(),
      getGroupRecords(supabase, groupId),
      supabase
        .from("rounds")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", targetUserId),
    ]);

  if (profileError) throw profileError;
  if (roundsError) throw roundsError;

  return {
    profile,
    recordsHeld: records.filter((r) => r.holderUserId === targetUserId),
    roundsPlayedCount: rounds?.length ?? 0,
  };
}

export type LifetimeStats = {
  roundsPlayed: number;
  recordsHeld: number;
  marqueeCoursesPlayed: number;
  statesPlayed: number;
  points: number;
};

/** Exported for the Course Champion card, which needs one user's lifetime
 *  stats outside the per-group-member batch getGroupLifetimeStats does. */
export async function fetchLifetimeStats(
  supabase: SupabaseClient,
  targetUserId: string
): Promise<LifetimeStats> {
  const { data, error } = await supabase.rpc("get_lifetime_stats", { target_user_id: targetUserId });
  if (error) throw error;
  const raw = data?.[0] as
    | { rounds_played: number; records_held: number; marquee_courses_played: number; states_played: number; points: number }
    | undefined;
  return {
    roundsPlayed: raw?.rounds_played ?? 0,
    recordsHeld: raw?.records_held ?? 0,
    marqueeCoursesPlayed: raw?.marquee_courses_played ?? 0,
    statesPlayed: raw?.states_played ?? 0,
    points: raw?.points ?? 0,
  };
}

/** Lifetime stats (incl. points) for every member of a group, in parallel — fine at friend-group scale. */
export async function getGroupLifetimeStats(
  supabase: SupabaseClient,
  memberIds: string[]
): Promise<Map<string, LifetimeStats>> {
  const entries = await Promise.all(
    memberIds.map(async (id) => [id, await fetchLifetimeStats(supabase, id)] as const)
  );
  return new Map(entries);
}

/**
 * Full profile data: lifetime stats via the get_lifetime_stats RPC (works
 * for any target sharing a group with the viewer), plus — only when
 * viewing your *own* profile, since this needs direct row access across
 * all your groups — the extra badge inputs that aren't privacy-safe to
 * expose for other users yet (best score-to-par, flagship-course checks).
 */
export async function getFullProfile(
  supabase: SupabaseClient,
  groupId: string,
  targetUserId: string,
  isSelf: boolean
) {
  const [{ data: profile, error: profileError }, { records }, lifetime] = await Promise.all([
    supabase.from("profiles").select("id, display_name, created_at").eq("id", targetUserId).single(),
    getGroupRecords(supabase, groupId),
    fetchLifetimeStats(supabase, targetUserId),
  ]);

  if (profileError) throw profileError;

  let bestScoreToPar: number | null = null;
  if (isSelf) {
    const { data: ownRounds } = await supabase
      .from("rounds")
      .select("score, courses(par)")
      .eq("user_id", targetUserId);
    for (const r of ownRounds ?? []) {
      const par = (r.courses as unknown as { par: number | null } | null)?.par;
      if (par == null) continue;
      const toPar = r.score - par;
      if (bestScoreToPar == null || toPar < bestScoreToPar) bestScoreToPar = toPar;
    }
  }

  return {
    profile,
    recordsHeldInGroup: records.filter((r) => r.holderUserId === targetUserId),
    lifetime,
    bestScoreToPar,
  };
}
