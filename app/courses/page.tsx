import { requireActiveGroup } from "@/lib/supabase/guards";
import { CourseSearch } from "./CourseSearch";

export default async function CoursesPage() {
  await requireActiveGroup();
  return <CourseSearch />;
}
