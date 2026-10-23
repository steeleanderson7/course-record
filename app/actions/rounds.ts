"use server";

import { createClient } from "@/lib/supabase/server";

type CreateRoundInput = {
  groupId: string;
  courseId: string;
  score: number;
  holesPlayed: 9 | 18;
  datePlayed: string;
  notes?: string;
};

export type CreateRoundResult = {
  roundId: string;
  isNewRecord: boolean;
  previousHolderName: string | null;
  previousScore: number | null;
  pointsEarned: number;
  isMarquee: boolean;
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
  const [{ data: priorRecord }, { data: course }] = await Promise.all([
    supabase
      .from("course_group_records")
      .select("holder_user_id, score, profiles(display_name)")
      .eq("course_id", input.courseId)
      .eq("group_id", input.groupId)
      .maybeSingle(),
    supabase.from("courses").select("is_marquee").eq("id", input.courseId).single(),
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
    })
    .select()
    .single();
  if (error) throw error;

  const isNewRecord =
    input.holesPlayed === 18 && (!priorRecord || input.score < priorRecord.score);
  const priorHolderWasSomeoneElse = priorRecord && priorRecord.holder_user_id !== user.id;
  const isMarquee = course?.is_marquee ?? false;

  const pointsEarned = 50 + (isNewRecord ? 100 : 0) + (isMarquee ? 200 : 0);

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
