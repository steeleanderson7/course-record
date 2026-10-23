-- Par: the territory map's "Selected Course" card shows "Par 72 · City, ST".
-- No structured par field exists in OSM for most courses, but many have it
-- embedded in a free-text `description` tag like "18 hole Par 70" — best
-- effort backfill below, leaves par null (UI shows "Par —") where it can't
-- be parsed.
alter table courses add column par smallint;

update courses
set par = (regexp_match(raw_osm_tags ->> 'description', 'Par\s+(\d+)', 'i'))[1]::smallint
where raw_osm_tags ->> 'description' ~* 'Par\s+\d+';

-- Marquee / "Top 100" flag — left unpopulated until a specific curated
-- list is seeded (see README follow-up); drives the Top 100 Club badges,
-- the +200pt scoring bonus, and the "Top 100 played" lifetime stat.
alter table courses add column is_marquee boolean not null default false;
create index courses_is_marquee_idx on courses (is_marquee) where is_marquee;
