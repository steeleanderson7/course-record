-- Course Record v1 schema.
-- Run against a Supabase project via the Supabase CLI or SQL editor.

create extension if not exists pg_trgm;
create extension if not exists postgis;

-- 1. Profiles -----------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- 2. Groups ---------------------------------------------------------------

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table groups enable row level security;
alter table group_members enable row level security;

create or replace function is_group_member(gid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- security definer because a brand-new member can't satisfy a normal RLS
-- insert policy on group_members before they're a member.
create or replace function redeem_invite(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
begin
  select id into gid from groups where invite_code = code;
  if gid is null then
    raise exception 'Invalid invite code';
  end if;

  insert into group_members (group_id, user_id, role)
  values (gid, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return gid;
end;
$$;

-- 3. Courses (global, shared across all groups) ----------------------------

create table courses (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('osm', 'user')),
  osm_type text check (osm_type in ('node', 'way', 'relation')),
  osm_id bigint,
  name text not null,
  lat double precision not null,
  lon double precision not null,
  -- last-synced raw OSM snapshot, kept separate so re-sync never
  -- silently overwrites a user's manual correction
  osm_name text,
  osm_lat double precision,
  osm_lon double precision,
  overridden_fields text[] not null default '{}',
  country_code text,
  region text,
  city text,
  raw_osm_tags jsonb,
  geom geography(point, 4326) generated always as (
    st_setsrid(st_makepoint(lon, lat), 4326)::geography
  ) stored,
  is_verified boolean not null default false,
  is_stale boolean not null default false,
  merged_into_id uuid references courses (id),
  created_by uuid references profiles (id),
  osm_last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_osm_key unique (osm_type, osm_id)
);

create index courses_name_trgm_idx on courses using gin (name gin_trgm_ops);
create index courses_geom_idx on courses using gist (geom);

alter table courses enable row level security;

-- 4. Rounds -----------------------------------------------------------------

create table rounds (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  course_id uuid not null references courses (id),
  user_id uuid not null references profiles (id),
  score int not null,
  holes_played smallint not null default 18 check (holes_played in (9, 18)),
  par_for_round smallint,
  date_played date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index rounds_course_group_idx on rounds (course_id, group_id, score, date_played, created_at);

alter table rounds enable row level security;

-- 5. Current-record view -----------------------------------------------------
-- security_invoker so RLS on `rounds` still applies when this view is queried.

create view course_group_records
with (security_invoker = true) as
select distinct on (course_id, group_id)
  course_id,
  group_id,
  user_id as holder_user_id,
  score,
  date_played,
  id as round_id
from (
  select
    r.course_id, r.group_id, r.user_id, r.score, r.date_played, r.id,
    rank() over (
      partition by r.course_id, r.group_id
      order by r.score asc, r.date_played asc, r.created_at asc
    ) as rnk
  from rounds r
  where r.holes_played = 18
) ranked
where rnk = 1
order by course_id, group_id;

-- Dedup helper for user-submitted courses: combines geo proximity with
-- trigram name similarity. Callers show results as "did you mean X?"
-- confirmations, never a hard block.
create or replace function find_similar_courses(p_name text, p_lat double precision, p_lon double precision, p_radius_m int default 500)
returns table (id uuid, name text, similarity real, distance_m double precision)
language sql
stable
as $$
  select
    c.id,
    c.name,
    similarity(c.name, p_name) as similarity,
    st_distance(c.geom, st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography) as distance_m
  from courses c
  where st_dwithin(c.geom, st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography, p_radius_m)
     or similarity(c.name, p_name) > 0.4
  order by distance_m asc;
$$;

-- 6. RLS policies -------------------------------------------------------------

create policy "profiles readable by self or groupmates" on profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from group_members gm1
      join group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid() and gm2.user_id = profiles.id
    )
  );

create policy "profiles updatable by self" on profiles
  for update using (id = auth.uid());

create policy "groups readable by members" on groups
  for select using (is_group_member(id));

create policy "groups insertable by any authenticated user" on groups
  for insert with check (auth.uid() = created_by);

create policy "group_members readable by members" on group_members
  for select using (is_group_member(group_id));

create policy "courses readable by all authenticated users" on courses
  for select using (auth.role() = 'authenticated');

create policy "courses insertable by authenticated users" on courses
  for insert with check (auth.role() = 'authenticated' and source = 'user');

create policy "courses updatable before verification by creator" on courses
  for update using (created_by = auth.uid() and not is_verified);

create policy "rounds readable by group members" on rounds
  for select using (is_group_member(group_id));

create policy "rounds insertable by group members" on rounds
  for insert with check (is_group_member(group_id) and user_id = auth.uid());
