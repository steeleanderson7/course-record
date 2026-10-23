import { notFound } from "next/navigation";
import { requireActiveGroup } from "@/lib/supabase/guards";
import { getFullProfile } from "@/lib/queries";
import { ResultStep } from "./ResultStep";

export default async function LogRoundStep3Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const courseId = params.courseId;
  if (!courseId) notFound();

  const { supabase, user, group } = await requireActiveGroup();

  const [{ data: course }, { lifetime }] = await Promise.all([
    supabase.from("courses").select("id, name, city, country_code, par").eq("id", courseId).single(),
    getFullProfile(supabase, group.id, user.id, true),
  ]);
  if (!course) notFound();

  return (
    <ResultStep
      course={{
        name: course.name,
        location: [course.city, course.country_code].filter(Boolean).join(", "),
        par: course.par,
      }}
      score={Number(params.score)}
      isNewRecord={params.isNewRecord === "true"}
      previousHolderName={params.previousHolderName ?? null}
      previousScore={params.previousScore ? Number(params.previousScore) : null}
      pointsEarned={Number(params.pointsEarned ?? 0)}
      isMarquee={params.isMarquee === "true"}
      totalPointsAfter={lifetime.points}
    />
  );
}
