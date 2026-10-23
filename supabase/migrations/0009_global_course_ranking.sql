-- Global per-course ranking — intentionally public (to any signed-in user),
-- unlike every other cross-group function so far which required sharing a
-- group with the target. This is the one deliberate privacy line this app
-- crosses: a user's display name + score at a course becomes visible to
-- anyone, not just groupmates, so good players can see where they rank
-- against the whole userbase, not just their friends. Never exposes which
-- group a round was logged in, just who/what/when.
--
-- Ranks each user's *best* 18-hole round at the course (not every round),
-- same tie-break as course_group_records (score asc, date_played asc,
-- created_at asc). No LIMIT — course-level round counts are small enough
-- that returning everyone and letting the app slice top-N is simpler than
-- a second "what's my rank" query.
create or replace function get_course_global_ranking(p_course_id uuid)
returns table (user_id uuid, display_name text, score int, date_played date, rnk bigint)
language sql
security definer
set search_path = public
stable
as $$
  with best_per_user as (
    select distinct on (r.user_id) r.user_id, r.score, r.date_played, r.created_at
    from rounds r
    where r.course_id = p_course_id and r.holes_played = 18 and auth.uid() is not null
    order by r.user_id, r.score asc, r.date_played asc, r.created_at asc
  )
  select
    b.user_id,
    p.display_name,
    b.score,
    b.date_played,
    rank() over (order by b.score asc, b.date_played asc, b.created_at asc) as rnk
  from best_per_user b
  join profiles p on p.id = b.user_id
  order by rnk;
$$;
