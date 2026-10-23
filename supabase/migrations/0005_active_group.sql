-- Multi-group membership already existed (group_members is many-to-many);
-- this adds *which* group is currently active, so the app can re-scope the
-- map/leaderboard/records-held stat when the user switches groups.
alter table profiles
  add column active_group_id uuid references groups (id) on delete set null;

-- Self-update already covered by the existing "profiles updatable by self"
-- policy — no new RLS policy needed.
