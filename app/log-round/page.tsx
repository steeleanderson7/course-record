import { requireActiveGroup } from "@/lib/supabase/guards";
import { CourseStep } from "./CourseStep";

export default async function LogRoundStep1Page() {
  await requireActiveGroup();
  return <CourseStep />;
}
