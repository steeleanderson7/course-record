-- Lifetime/account-level stats (rounds played, records held, marquee
-- courses played, points) need to be visible to *anyone sharing a group*
-- with the target user — same trust boundary as the "profiles readable by
-- groupmates" policy — but the underlying `rounds` rows may live in other
-- groups the caller isn't a member of, which RLS correctly blocks at the
-- row level. This security-definer function (same pattern as
-- create_group/redeem_invite) returns only the aggregate, never row-level
-- detail, after checking the caller shares at least one group with the
-- target (or is the target themselves).
--
-- v1 simplification, documented rather than solved: "records held" here
-- means *currently* held (course_group_records), not "ever set" — a
-- record you've since lost no longer counts, which also means the points
-- bonus for a record isn't retroactively removed when you lose it, only
-- not re-earned. Good enough for now; a ledger-based point system is the
-- natural v2 fix if this starts to feel wrong in practice.
create or replace function get_lifetime_stats(target_user_id uuid)
returns table (
  rounds_played int,
  records_held int,
  marquee_courses_played int,
  states_played int,
  points int
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if target_user_id != auth.uid() and not exists (
    select 1 from group_members gm1
    join group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = auth.uid() and gm2.user_id = target_user_id
  ) then
    raise exception 'Not authorized to view this user''s stats';
  end if;

  return query
  select
    (select count(*)::int from rounds r where r.user_id = target_user_id),
    (select count(*)::int from course_group_records cgr where cgr.holder_user_id = target_user_id),
    (select count(distinct r.course_id)::int from rounds r join courses c on c.id = r.course_id
       where r.user_id = target_user_id and c.is_marquee),
    -- "States played" uses courses.region (OSM address tags), which are
    -- sparsely populated — a known undercount, not solved here (the
    -- territory map instead uses real point-in-polygon state lookup,
    -- which isn't usable here without leaking row-level course detail
    -- across groups the caller isn't in).
    (select count(distinct c.region)::int from rounds r join courses c on c.id = r.course_id
       where r.user_id = target_user_id and c.region is not null),
    (
      (select count(*) from rounds r where r.user_id = target_user_id) * 50
      + (select count(*) from course_group_records cgr where cgr.holder_user_id = target_user_id) * 100
      + (select count(distinct r.course_id) from rounds r join courses c on c.id = r.course_id
           where r.user_id = target_user_id and c.is_marquee) * 200
    )::int;
end;
$$;
