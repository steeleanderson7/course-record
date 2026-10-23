-- `group_members` intentionally has no direct client-insert policy — all
-- membership changes go through security-definer functions (same reasoning
-- as `redeem_invite`). This migration adds the missing one for group
-- creation: creating a group and adding the creator as its first member
-- must happen atomically, as the table owner, bypassing RLS.
create or replace function create_group(group_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
  code text;
begin
  code := upper(substr(md5(random()::text), 1, 6));

  insert into groups (name, invite_code, created_by)
  values (group_name, code, auth.uid())
  returning id into gid;

  insert into group_members (group_id, user_id, role)
  values (gid, auth.uid(), 'owner');

  return gid;
end;
$$;

-- A creator should always be able to see their own group, independent of
-- membership state (defensive — in practice create_group above already
-- adds them as a member in the same transaction).
drop policy "groups readable by members" on groups;
create policy "groups readable by members or creator" on groups
  for select using (is_group_member(id) or created_by = auth.uid());
