import { requireActiveGroup } from "@/lib/supabase/guards";
import { CourseStep } from "./CourseStep";

export default async function LogRoundStep1Page() {
  const { supabase, user } = await requireActiveGroup();

  // "Recently Played" chips (mobile mockup) — the fastest path back to a
  // course you've already logged before, which matters most for the exact
  // use case this flow is optimized for (re-logging a familiar course
  // standing on the tee box). Simple recency query, deduped by course in
  // JS since a user can have many rounds at the same course.
  const { data: recentRounds } = await supabase
    .from("rounds")
    .select("course_id, date_played, courses(id, name)")
    .eq("user_id", user.id)
    .order("date_played", { ascending: false })
    .limit(20);

  const seen = new Set<string>();
  const recentCourses: { id: string; name: string }[] = [];
  for (const r of recentRounds ?? []) {
    const course = r.courses as unknown as { id: string; name: string } | null;
    if (!course || seen.has(course.id)) continue;
    seen.add(course.id);
    recentCourses.push(course);
    if (recentCourses.length >= 5) break;
  }

  return <CourseStep recentCourses={recentCourses} />;
}
