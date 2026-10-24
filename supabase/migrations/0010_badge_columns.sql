-- New columns backing the 100-badge tiered system (20 families x 5 tiers).
-- See 0011_player_metrics.sql for the counters/RPCs that actually drive
-- badge progress — this migration only adds the raw data they read from.

-- TPC network / notable-architect flags — same pattern as is_marquee
-- (0006_courses_par_marquee.sql): left unpopulated until a curated list is
-- seeded via scripts/seed-tpc-courses.ts / scripts/seed-architect-courses.ts.
-- Drive the tpc-played and architect-played badge families.
alter table courses add column is_tpc boolean not null default false;
create index courses_is_tpc_idx on courses (is_tpc) where is_tpc;

alter table courses add column is_notable_architect boolean not null default false;
create index courses_is_notable_architect_idx on courses (is_notable_architect) where is_notable_architect;

-- Optional per-round scoring detail for the birdies/eagles/aces badge
-- families. Nullable and never required by the score step — null means
-- "not reported," not "zero," so lifetime sums must coalesce to 0 rather
-- than treating a blank entry as a round with no birdies.
alter table rounds add column birdies smallint;
alter table rounds add column eagles_plus smallint;
alter table rounds add column aces smallint;

-- Idempotency guard for apply_record_change_metrics (0011_player_metrics.sql):
-- that function does a blind +1 increment (not a recompute-from-scratch
-- set) for records_claimed_lifetime/records_defended_lifetime, so it must
-- never run twice for the same round. This column is the guard.
alter table rounds add column record_metrics_applied_at timestamptz;
