"use server";

import { createClient } from "@/lib/supabase/server";
import { recomputeOwnMetrics, getPlayerMetricsMap } from "@/lib/badgeMetrics";
import { diffNewlyEarnedBadges, countEarnedBadges, type Badge } from "@/lib/badgeCatalog";

type CreateRoundInput = {
  groupId: string;
  courseId: string;
  score: number;
  holesPlayed: 9 | 18;
  datePlayed: string;
  notes?: string;
  birdies?: number;
  eaglesPlus?: number;
  aces?: number;
};

export type CreateRoundResult = {
  roundId: string;
  isNewRecord: boolean;
  previousHolderName: string | null;
  previousScore: number | null;
  pointsEarned: number;
  isMarquee: boolean;
  /** Badges this round pushed past a tier, highest tier first — queued by
   *  the celebration overlay, one at a time. Only ever reflects the acting
   *  user's own badges: if this round took a record from someone else, that
   *  person's own player_metrics updates correctly (see
   *  apply_record_change_metrics) but they aren't present in this request
   *  to show a live popup to — no realtime/push infra exists in this app to
   *  deliver one. They'll see it next time they check their own
   *  Dashboard/Badges page. Documented v1 limit, not solved here. */
  newlyEarnedBadges: Badge[];
  totalEarnedCount: number;
};

export async function createRound(input: CreateRoundInput): Promise<CreateRoundResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Snapshot the record *before* inserting, so we can tell the celebration
  // screen whether this round changed anything and who (if anyone) it
  // unseated — course_group_records only reflects the post-insert state.
  // metricsBefore rides along in the same Promise.all — independent of the
  // other two, so the badge-earned diff's "before" snapshot costs no extra
  // latency.
  const [{ data: priorRecord }, { data: course }, metricsBefore] = await Promise.all([
    supabase
      .from("course_group_records")
      .select("holder_user_id, score, profiles(display_name)")
      .eq("course_id", input.courseId)
      .eq("group_id", input.groupId)
      .maybeSingle(),
    supabase.from("courses").select("is_marquee").eq("id", input.courseId).single(),
    getPlayerMetricsMap(supabase, user.id).catch(() => ({}) as Record<string, number>),
  ]);

  const { data, error } = await supabase
    .from("rounds")
    .insert({
      group_id: input.groupId,
      course_id: input.courseId,
      user_id: user.id,
      score: input.score,
      holes_played: input.holesPlayed,
      date_played: input.datePlayed,
      notes: input.notes,
      birdies: input.birdies ?? null,
      eagles_plus: input.eaglesPlus ?? null,
      aces: input.aces ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  const isNewRecord =
    input.holesPlayed === 18 && (!priorRecord || input.score < priorRecord.score);
  const priorHolderWasSomeoneElse = priorRecord && priorRecord.holder_user_id !== user.id;
  const isMarquee = course?.is_marquee ?? false;

  const pointsEarned = 50 + (isNewRecord ? 100 : 0) + (isMarquee ? 200 : 0);

  // Badge progress is a bonus layer, not core functionality — never let a
  // metrics bug fail the round-logging flow itself. Awaited rather than
  // fire-and-forget: a serverless function instance can be torn down the
  // moment the response is sent, which would silently kill an un-awaited
  // promise before it finishes.
  let newlyEarnedBadges: Badge[] = [];
  let totalEarnedCount = countEarnedBadges(metricsBefore);
  try {
    await recomputeOwnMetrics(supabase, user.id);
    if (priorHolderWasSomeoneElse) {
      await supabase.rpc("apply_record_change_metrics", { p_round_id: data.id });
    }
    const metricsAfter = await getPlayerMetricsMap(supabase, user.id);
    newlyEarnedBadges = diffNewlyEarnedBadges(metricsBefore, metricsAfter);
    totalEarnedCount = countEarnedBadges(metricsAfter);
  } catch (err) {
    console.error("Badge metrics recompute failed (non-fatal):", err);
  }

  return {
    roundId: data.id,
    isNewRecord,
    previousHolderName:
      isNewRecord && priorHolderWasSomeoneElse
        ? ((priorRecord!.profiles as unknown as { display_name: string } | null)?.display_name ?? "someone")
        : null,
    previousScore: isNewRecord && priorRecord ? priorRecord.score : null,
    pointsEarned,
    isMarquee,
    newlyEarnedBadges,
    totalEarnedCount,
  };
}

type AddCourseInput = {
  name: string;
  lat: number;
  lon: number;
};

/**
 * Two-step flow: call `findCourseCandidates` first and show the user any
 * near-duplicate matches ("did you mean X?") before calling `addCourse`
 * to actually insert — never block automatically, only confirm.
 */
export async function findCourseCandidates(input: AddCourseInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("find_similar_courses", {
    p_name: input.name,
    p_lat: input.lat,
    p_lon: input.lon,
    p_radius_m: 500,
  });
  if (error) throw error;
  return data;
}

export async function addCourse(input: AddCourseInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({ source: "user", name: input.name, lat: input.lat, lon: input.lon })
    .select()
    .single();
  if (error) throw error;
  return data;
}
