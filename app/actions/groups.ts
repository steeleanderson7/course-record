"use server";

import { createClient } from "@/lib/supabase/server";

export async function createGroup(name: string) {
  const supabase = await createClient();
  // Inserting the group and adding the creator as its first member has to
  // happen atomically as a security-definer function — group_members has
  // no direct client-insert policy (membership changes only ever go
  // through functions like this or redeem_invite).
  const { data, error } = await supabase.rpc("create_group", { group_name: name });
  if (error) throw error;
  return data as string; // group_id
}

export async function redeemInvite(code: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_invite", { code });
  if (error) throw error;
  return data as string; // group_id
}

export async function setActiveGroup(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Confirms membership before switching — a plain update() would silently
  // no-op on groups you don't belong to (RLS-correct either way), but this
  // gives a real error instead of a quiet failure.
  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)
    .eq("group_id", groupId)
    .maybeSingle();
  if (!membership) throw new Error("Not a member of that group");

  const { error } = await supabase
    .from("profiles")
    .update({ active_group_id: groupId })
    .eq("id", user.id);
  if (error) throw error;
}
