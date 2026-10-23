-- General-purpose trigram-ranked name search — returns the *most similar*
-- courses first regardless of how many rows merely contain a common
-- substring (which plain ILIKE can't do without an explicit ORDER BY, and
-- which silently truncated the real match out of a LIMIT'd result set
-- while seeding the Top 100 list for common words like "pine"/"hills").
create or replace function search_courses_by_name(q text, match_limit int default 20)
returns table (id uuid, name text, lat double precision, lon double precision, sim real)
language sql
stable
as $$
  select id, name, lat, lon, similarity(name, q) as sim
  from courses
  where similarity(name, q) > 0.15
  order by sim desc
  limit match_limit;
$$;
