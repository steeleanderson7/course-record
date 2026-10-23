-- Moves the "don't clobber a user's manual edit on re-sync" rule into the
-- database itself: whenever a course row is inserted/updated, copy the
-- osm_* shadow values into the authoritative name/lat/lon columns unless
-- that field is listed in overridden_fields. This lets the ingestion
-- script do plain upserts (via the REST API, not a raw DB connection)
-- without needing to express conditional per-field merge logic itself.
create or replace function apply_osm_shadow_fields()
returns trigger
language plpgsql
as $$
begin
  if not ('name' = any(new.overridden_fields)) then
    new.name := coalesce(new.osm_name, new.name);
  end if;
  if not ('location' = any(new.overridden_fields)) then
    new.lat := coalesce(new.osm_lat, new.lat);
    new.lon := coalesce(new.osm_lon, new.lon);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger courses_apply_osm_shadow
  before insert or update on courses
  for each row execute function apply_osm_shadow_fields();
