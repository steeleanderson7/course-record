-- Backs the "show unclaimed courses" map toggle: fetch every real course in
-- a geographic bounding box, for the client to refine down to one exact
-- state via findState() (point-in-polygon, same primitive the rest of the
-- app already uses — see lib/geo/us-projection.ts). Mirrors the existing
-- find_similar_courses function's pattern (0001_init.sql) of querying the
-- courses.geom geography column directly, so this hits the existing
-- courses_geom_idx GiST index via bbox overlap (&&) rather than an
-- unindexed scan over the raw lat/lon columns.
--
-- merged_into_id is null excludes rows a future dedup pass flags as a
-- duplicate of another course — nothing writes that column yet, so this is
-- free insurance against ever showing a "ghost" pin, not a no-op today that
-- becomes meaningful later.
create or replace function courses_in_bbox(
  p_min_lon double precision,
  p_min_lat double precision,
  p_max_lon double precision,
  p_max_lat double precision
)
returns table (
  id uuid,
  name text,
  city text,
  country_code text,
  lat double precision,
  lon double precision,
  par smallint
)
language sql
stable
as $$
  select c.id, c.name, c.city, c.country_code, c.lat, c.lon, c.par
  from courses c
  where c.geom && st_makeenvelope(p_min_lon, p_min_lat, p_max_lon, p_max_lat, 4326)::geography
    and c.merged_into_id is null
  order by c.name;
$$;
