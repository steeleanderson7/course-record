-- Per-user lifetime badge metrics, one row per (user, metric) rather than
-- one wide row per user — adding a 21st badge family later is purely an
-- application-layer change (a new metric key), never a migration.
--
-- No direct select/insert/update policy, same reasoning as group_members
-- (0001_init.sql/0003_atomic_group_creation.sql): "intentionally has no
-- direct client-insert policy — all membership changes go through
-- security-definer functions." Every read/write here goes through one of
-- the three functions below, each of which does its own authorization
-- rather than relying on row-level RLS to get it right.
create table player_metrics (
  user_id uuid not null references profiles (id) on delete cascade,
  metric text not null,
  value int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, metric)
);

alter table player_metrics enable row level security;

-- 1. Bulk "recompute from scratch" write, for the metrics that are cheap to
-- fully recompute from the caller's own rounds+courses on every round log
-- (rounds_played, states_played, countries_played, top_100_courses_played,
-- tpc_courses_played, architect_courses_played, birdies_lifetime,
-- eagles_plus_lifetime, holes_in_one_lifetime, active_month_streak,
-- records_held_concurrent — see lib/badgeMetrics.ts).
--
-- Always writes the CALLER's own metrics (auth.uid(), not a parameter) —
-- there is no way to use this to write someone else's row. Safe to call
-- repeatedly/concurrently: every value is an absolute set, not an
-- increment, so a replay just rewrites the same correct number.
create or replace function upsert_player_metrics(p_metrics jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  kv record;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  for kv in select * from jsonb_each_text(p_metrics) loop
    insert into player_metrics (user_id, metric, value, updated_at)
    values (uid, kv.key, kv.value::int, now())
    on conflict (user_id, metric) do update
      set value = excluded.value, updated_at = now();
  end loop;
end;
$$;

-- 2. Record-change counters: records_claimed_lifetime / records_defended_lifetime
-- are blind +1 increments, not recomputes, and sometimes must credit a
-- DIFFERENT user than the caller (the dethroned holder gets credit for a
-- defense even when the challenger is the one submitting the round) — so
-- this can't be "write my own row" like (1). Rather than trust a
-- caller-supplied beneficiary id (spoofable from devtools — any signed-in
-- user could inflate their own claims or forge/deflate someone else's), this
-- takes only an already-inserted, already-authorized round id and
-- re-derives the real prior holder itself from `rounds`, so the outcome
-- can't be forged by the caller.
--
-- record_metrics_applied_at (0010_badge_columns.sql) makes this idempotent:
-- a replayed/duplicate call for the same round is a no-op, which also
-- closes off using this as a repeatable-increment exploit.
create or replace function apply_record_change_metrics(p_round_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rnd rounds%rowtype;
  prior_holder uuid;
  prior_score int;
begin
  select * into rnd from rounds where id = p_round_id;
  if rnd is null then
    raise exception 'Round not found';
  end if;
  if not (rnd.user_id = auth.uid() or is_group_member(rnd.group_id)) then
    raise exception 'Not authorized';
  end if;

  update rounds
     set record_metrics_applied_at = now()
   where id = p_round_id and record_metrics_applied_at is null;
  if not found then
    return; -- already processed, don't double-count
  end if;

  if rnd.holes_played <> 18 then
    return; -- only 18-hole rounds can change a course record
  end if;

  select r2.user_id, r2.score into prior_holder, prior_score
  from rounds r2
  where r2.course_id = rnd.course_id
    and r2.group_id = rnd.group_id
    and r2.holes_played = 18
    and r2.id <> rnd.id
  order by r2.score asc, r2.date_played asc, r2.created_at asc
  limit 1;

  if prior_holder is null or prior_holder = rnd.user_id then
    return; -- first-ever record, or you already held it: no challenge occurred
  end if;

  if rnd.score < prior_score then
    -- CLAIM: rnd.user_id took the record from prior_holder.
    insert into player_metrics (user_id, metric, value, updated_at)
    values (rnd.user_id, 'records_claimed_lifetime', 1, now())
    on conflict (user_id, metric) do update
      set value = player_metrics.value + 1, updated_at = now();

    -- Recompute records_held_concurrent for both parties — same
    -- cross-group "currently held" aggregate get_lifetime_stats uses.
    insert into player_metrics (user_id, metric, value, updated_at)
    values (
      rnd.user_id, 'records_held_concurrent',
      (select count(*)::int from course_group_records where holder_user_id = rnd.user_id),
      now()
    )
    on conflict (user_id, metric) do update
      set value = excluded.value, updated_at = now();

    insert into player_metrics (user_id, metric, value, updated_at)
    values (
      prior_holder, 'records_held_concurrent',
      (select count(*)::int from course_group_records where holder_user_id = prior_holder),
      now()
    )
    on conflict (user_id, metric) do update
      set value = excluded.value, updated_at = now();
  else
    -- DEFEND: prior_holder's record survived this challenge.
    insert into player_metrics (user_id, metric, value, updated_at)
    values (prior_holder, 'records_defended_lifetime', 1, now())
    on conflict (user_id, metric) do update
      set value = player_metrics.value + 1, updated_at = now();
  end if;
end;
$$;

-- 3. Read, for any target sharing a group with the caller (or self) — same
-- trust boundary and pattern as get_lifetime_stats (0007_lifetime_stats.sql).
-- Returns only the rows that exist; metrics with no row (never computed, or
-- one of the permanently-locked families with no backing data yet) are
-- treated as 0 by the caller.
create or replace function get_player_metrics(p_target_user_id uuid)
returns table (metric text, value int)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if p_target_user_id != auth.uid() and not exists (
    select 1 from group_members gm1
    join group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = auth.uid() and gm2.user_id = p_target_user_id
  ) then
    raise exception 'Not authorized to view this user''s metrics';
  end if;

  return query
  select pm.metric, pm.value from player_metrics pm where pm.user_id = p_target_user_id;
end;
$$;
