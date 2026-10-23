import { notFound } from "next/navigation";
import { requireActiveGroup } from "@/lib/supabase/guards";
import { ScoreStep } from "./ScoreStep";

export default async function LogRoundStep2Page({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const { courseId } = await searchParams;
  if (!courseId) notFound();

  const { supabase, group } = await requireActiveGroup();

  const [{ data: course }, { data: record }] = await Promise.all([
    supabase.from("courses").select("id, name, city, country_code, par").eq("id", courseId).single(),
    supabase
      .from("course_group_records")
      .select("score, profiles(display_name)")
      .eq("course_id", courseId)
      .eq("group_id", group.id)
      .maybeSingle(),
  ]);
  if (!course) notFound();

  const currentRecord = record
    ? {
        score: record.score,
        holderName:
          (record.profiles as unknown as { display_name: string } | null)?.display_name ?? "someone",
      }
    : null;

  return (
    <ScoreStep
      groupId={group.id}
      course={{
        id: course.id,
        name: course.name,
        location: [course.city, course.country_code].filter(Boolean).join(", "),
        par: course.par,
      }}
      currentRecord={currentRecord}
    />
  );
}
