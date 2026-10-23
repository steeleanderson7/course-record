import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

type ActiveGroup = { id: string; name: string; invite_code: string; created_by: string };

/**
 * Resolves which group is "active" for this request: the user's
 * `profiles.active_group_id` if they're still a member of it, else their
 * first-joined group (and that becomes the new sticky default). Redirects
 * to /onboarding if they belong to no groups at all.
 */
export async function requireActiveGroup() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_group_id")
    .eq("id", user.id)
    .single();

  if (profile?.active_group_id) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("groups(id, name, invite_code, created_by)")
      .eq("user_id", user.id)
      .eq("group_id", profile.active_group_id)
      .maybeSingle();

    if (membership?.groups) {
      return { supabase, user, group: membership.groups as unknown as ActiveGroup };
    }
    // Active group is stale (e.g. they left it) — fall through to re-pick.
  }

  const { data: fallback, error } = await supabase
    .from("group_members")
    .select("groups(id, name, invite_code, created_by)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!fallback?.groups) redirect("/onboarding");

  const group = fallback.groups as unknown as ActiveGroup;
  await supabase.from("profiles").update({ active_group_id: group.id }).eq("id", user.id);

  return { supabase, user, group };
}

/**
 * Non-redirecting version for the NavBar, which renders on every page
 * (including logged-out marketing/login/signup pages, and mid-onboarding
 * before a user has any group yet).
 */
export async function getNavContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, group: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_group_id, display_name")
    .eq("id", user.id)
    .single();

  if (profile?.active_group_id) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("groups(id, name)")
      .eq("user_id", user.id)
      .eq("group_id", profile.active_group_id)
      .maybeSingle();
    if (membership?.groups) {
      return {
        user: { id: user.id, displayName: profile.display_name },
        group: membership.groups as unknown as { id: string; name: string },
      };
    }
  }

  const { data: fallback } = await supabase
    .from("group_members")
    .select("groups(id, name)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    user: { id: user.id, displayName: profile?.display_name ?? null },
    group: (fallback?.groups as unknown as { id: string; name: string } | undefined) ?? null,
  };
}
