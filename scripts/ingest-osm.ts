/**
 * One-time / periodic ETL job: pulls every named `leisure=golf_course`
 * object from OpenStreetMap via the Overpass API and upserts it into the
 * `courses` table via the Supabase REST API (service role key, bypasses
 * RLS). Run via `npm run ingest:osm` (locally, or from a scheduled GitHub
 * Actions workflow) — never as a Vercel route, since a global query +
 * ~30k-row upsert exceeds serverless function time limits.
 *
 * Re-sync safety: a `courses_apply_osm_shadow` DB trigger (see
 * supabase/migrations/0004_osm_shadow_trigger.sql) only copies osm_name/
 * osm_lat/osm_lon into the authoritative name/lat/lon columns when that
 * field isn't listed in the row's `overridden_fields` — so this script
 * can do plain upserts without worrying about clobbering a user's edit.
 */
import { createClient } from "@supabase/supabase-js";

const OVERPASS_ENDPOINT =
  process.env.OVERPASS_ENDPOINT ?? "https://overpass-api.de/api/interpreter";

const BATCH_SIZE = 500;

const QUERY = `
[out:json][timeout:900];
nwr["leisure"="golf_course"]["name"];
out center tags;
`;

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
};

async function fetchCourses(): Promise<OverpassElement[]> {
  const res = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "*/*",
      "User-Agent": "courserecord-golf-ingest/1.0",
    },
    body: new URLSearchParams({ data: QUERY }),
  });
  if (!res.ok) {
    throw new Error(`Overpass request failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json.elements as OverpassElement[];
}

function toRow(element: OverpassElement) {
  const { lat, lon } = element.center ?? element;
  if (lat == null || lon == null) return null;

  const name = element.tags.name;
  return {
    osm_type: element.type,
    osm_id: element.id,
    source: "osm" as const,
    name,
    lat,
    lon,
    osm_name: name,
    osm_lat: lat,
    osm_lon: lon,
    country_code: element.tags["addr:country"] ?? null,
    region: element.tags["addr:state"] ?? element.tags["addr:province"] ?? null,
    city: element.tags["addr:city"] ?? null,
    raw_osm_tags: element.tags,
    osm_last_seen_at: new Date(0).toISOString(), // overwritten by `now()`-equivalent below
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  const supabase = createClient(url, serviceKey);

  console.log("Fetching golf courses from Overpass...");
  const elements = await fetchCourses();
  const rows = elements.map(toRow).filter((r): r is NonNullable<typeof r> => r !== null);
  console.log(`Fetched ${elements.length} elements (${rows.length} with coordinates). Upserting...`);

  const now = new Date().toISOString();
  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((r) => ({ ...r, osm_last_seen_at: now }));
    const { error } = await supabase.from("courses").upsert(batch, { onConflict: "osm_type,osm_id" });
    if (error) throw error;
    upserted += batch.length;
    console.log(`  ${upserted}/${rows.length}`);
  }

  console.log(`Done. Upserted ${upserted} courses.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
