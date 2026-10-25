"use server";

import { createClient } from "@/lib/supabase/server";
import { getCoursesInState } from "@/lib/queries";
import type { Course } from "@/lib/types";

/**
 * Backs the state map's "show unclaimed courses" toggle — fetched on
 * demand (not on every page load) since most states' full course lists run
 * into the hundreds. No group-membership check needed: courses aren't
 * group-private data (confirmed via RLS — "readable by all authenticated
 * users", the same posture /api/courses/search already relies on), just an
 * authenticated session.
 */
export async function getCoursesInStateAction(stateName: string): Promise<Course[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  return getCoursesInState(supabase, stateName);
}
