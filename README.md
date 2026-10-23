# Course Record

Log golf rounds with friends; whoever shoots the lowest score at a course holds the "course record." Centerpiece feature is a world map showing who holds what, with a Voronoi "territory" view.

Full architecture/data-model rationale: see the plan this was built from — data model, RLS design, OSM ingestion, and map/UX design decisions are all documented there.

## Status

Fully live against a real Supabase project — no mock data left. Every page reads/writes through RLS-protected queries, verified end-to-end against the live database (auth, group creation/joining, logging a round, and every downstream query it feeds: ledger, leaderboard, map, course detail, profile).

- `supabase/migrations/0001-0004` — schema, RLS policies, `course_group_records` view, the atomic `create_group`/`redeem_invite` functions, and the OSM-shadow-field trigger. All run and verified.
- `lib/supabase/{client,server}.ts`, `proxy.ts` — Supabase SSR client + session refresh.
- `app/login`, `app/signup`, `app/onboarding`, `components/layout/AuthMenu.tsx` — real Supabase Auth.
- `lib/queries.ts`, `lib/supabase/guards.ts` — shared data-fetching + auth/active-group guards used by every page.
- `app/dashboard`, `app/leaderboard`, `app/courses`, `app/courses/[id]`, `app/log-round`, `app/map`, `app/profile/[id]` — all real data.
- 31,645 real golf courses imported from OpenStreetMap via `scripts/ingest-osm.ts`.

## Next steps

- Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as GitHub Actions secrets so the scheduled ingestion + keepalive workflows run (currently only tested by running them locally).
- A real browser click-through hasn't happened yet — this was built/verified from the CLI against the live DB (see conversation history). Worth a manual pass through signup → onboarding → log a round → map/leaderboard before inviting friends.
- v1 simplifications worth knowing: only one active group is used per user (the first one joined — no group switcher yet); only 18-hole rounds count toward records; the courses search page doesn't show per-course record info inline (only on the detail page).

## Getting started

```bash
npm run dev
```

Open http://localhost:3000 — it redirects to `/dashboard`. Try `/map` for the centerpiece feature (toggle "Pins" vs "Territory" in the left rail).

## Stack

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, Supabase (Postgres + Auth), MapLibre GL + OpenFreeMap (free, no API key) via `react-map-gl/maplibre`, `d3-geo-voronoi` for the territory view. Deployed on Vercel.
