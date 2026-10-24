/**
 * One-time seed: flags `courses.is_notable_architect = true` for real
 * courses in our database designed by one of the famous architects named in
 * data/badges.json's architect-played family (Nicklaus, Fazio, Dye,
 * MacKenzie, Doak, Coore & Crenshaw) — drives that badge family.
 *
 * Same fuzzy-matching approach as scripts/seed-marquee-courses.ts. The list
 * below is a curated, deliberately non-exhaustive set of well-documented
 * designs by each of the six named architects (each of whom has built
 * dozens to hundreds of courses — this covers famous/notable examples, not
 * every course they ever touched, consistent with "famous-architect
 * courses" rather than a claim of completeness). US-only, same reason as
 * seed-tpc-courses.ts: the state-mismatch disqualifier only knows US state
 * boundaries.
 *
 * Prints a full match report. Only applies the `is_notable_architect`
 * update for matches at or above CONFIDENT_THRESHOLD; everything else is
 * listed under "NEEDS REVIEW" and left untouched.
 */
import { createClient } from "@supabase/supabase-js";
import { findState } from "../lib/geo/us-projection";
import { STATE_ABBREVIATIONS } from "../lib/geo/us-states";

const CONFIDENT_THRESHOLD = 0.55;

type CuratedEntry = { name: string; city: string; stateAbbr: string; architect: string };

const ARCHITECT_COURSES: CuratedEntry[] = [
  // Jack Nicklaus
  { name: "Muirfield Village Golf Club", city: "Dublin", stateAbbr: "OH", architect: "Nicklaus" },
  { name: "Shoal Creek", city: "Shoal Creek", stateAbbr: "AL", architect: "Nicklaus" },
  { name: "Desert Highlands Golf Club", city: "Scottsdale", stateAbbr: "AZ", architect: "Nicklaus" },
  // Tom Fazio
  { name: "Shadow Creek Golf Course", city: "North Las Vegas", stateAbbr: "NV", architect: "Fazio" },
  { name: "Wade Hampton Golf Club", city: "Cashiers", stateAbbr: "NC", architect: "Fazio" },
  { name: "Victoria National Golf Club", city: "Newburgh", stateAbbr: "IN", architect: "Fazio" },
  // Pete Dye
  { name: "Whistling Straits", city: "Haven", stateAbbr: "WI", architect: "Dye" },
  { name: "Harbour Town Golf Links", city: "Hilton Head Island", stateAbbr: "SC", architect: "Dye" },
  { name: "Crooked Stick Golf Club", city: "Carmel", stateAbbr: "IN", architect: "Dye" },
  { name: "TPC Sawgrass", city: "Ponte Vedra Beach", stateAbbr: "FL", architect: "Dye" },
  // Alister MacKenzie
  { name: "Augusta National Golf Club", city: "Augusta", stateAbbr: "GA", architect: "MacKenzie" },
  { name: "Cypress Point Club", city: "Pebble Beach", stateAbbr: "CA", architect: "MacKenzie" },
  { name: "Pasatiempo Golf Club", city: "Santa Cruz", stateAbbr: "CA", architect: "MacKenzie" },
  // Tom Doak
  { name: "Pacific Dunes", city: "Bandon", stateAbbr: "OR", architect: "Doak" },
  { name: "Old Macdonald", city: "Bandon", stateAbbr: "OR", architect: "Doak" },
  { name: "Ballyneal Golf Club", city: "Holyoke", stateAbbr: "CO", architect: "Doak" },
  // Coore & Crenshaw
  { name: "Sand Hills Golf Club", city: "Mullen", stateAbbr: "NE", architect: "Coore & Crenshaw" },
  { name: "Friar's Head Golf Club", city: "Baiting Hollow", stateAbbr: "NY", architect: "Coore & Crenshaw" },
  { name: "Bandon Trails", city: "Bandon", stateAbbr: "OR", architect: "Coore & Crenshaw" },
];

/**
 * Confirmed via web search before this ran, for cases where the algorithm's
 * raw trigram/bigram similarity could plausibly pick an unrelated course —
 * left empty until a real dry run surfaces a specific mismatch worth
 * recording.
 */
const MANUAL_OVERRIDES: Record<string, string> = {};
const MANUAL_EXCLUSIONS = new Set<string>();

const ABBR_TO_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_ABBREVIATIONS).map(([name, abbr]) => [abbr, name])
);

/** Normalized Dice/bigram similarity — good enough for short proper-noun matching without a DB round trip per comparison. */
function similarity(a: string, b: string): number {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const bigrams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const sa = bigrams(norm(a));
  const sb = bigrams(norm(b));
  if (sa.size === 0 || sb.size === 0) return 0;
  let overlap = 0;
  for (const bg of sa) if (sb.has(bg)) overlap++;
  return (2 * overlap) / (sa.size + sb.size);
}

const GENERIC_SUFFIX = /\s+(golf (course|club|links|resort)|country club|resort|club)\s*$/i;
function stripGenericSuffix(name: string): string | null {
  const stripped = name.replace(GENERIC_SUFFIX, "").trim();
  return stripped !== name.trim() && stripped.length > 2 ? stripped : null;
}

function candidateSearchTerms(fullName: string): string[] {
  const terms = new Set<string>();
  terms.add(fullName);
  const stripped = stripGenericSuffix(fullName);
  if (stripped) terms.add(stripped);
  return [...terms];
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const confirmed: { entry: CuratedEntry; courseId: string; courseName: string; score: number }[] = [];
  const needsReview: { entry: CuratedEntry; best: { name: string; score: number } | null }[] = [];

  for (const entry of ARCHITECT_COURSES) {
    if (MANUAL_OVERRIDES[entry.name]) {
      confirmed.push({
        entry,
        courseId: MANUAL_OVERRIDES[entry.name],
        courseName: "(manual override)",
        score: 1,
      });
      continue;
    }

    const expectedState = ABBR_TO_STATE[entry.stateAbbr];
    const terms = candidateSearchTerms(entry.name);

    const seen = new Map<string, { name: string; lat: number; lon: number }>();
    for (const term of terms) {
      const { data, error } = await supabase.rpc("search_courses_by_name", { q: term, match_limit: 15 });
      if (error) throw error;
      for (const row of data ?? []) seen.set(row.id, { name: row.name, lat: row.lat, lon: row.lon });
    }

    let best: { id: string; name: string; score: number } | null = null;
    for (const [id, candidate] of seen) {
      const state = findState(candidate.lon, candidate.lat);
      if (expectedState && state?.name !== expectedState) continue; // state mismatch disqualifies
      const score = Math.max(...terms.map((t) => similarity(t, candidate.name)));
      if (!best || score > best.score) best = { id, name: candidate.name, score };
    }

    if (best && best.score >= CONFIDENT_THRESHOLD && !MANUAL_EXCLUSIONS.has(entry.name)) {
      confirmed.push({ entry, courseId: best.id, courseName: best.name, score: best.score });
    } else {
      needsReview.push({ entry, best: best ? { name: best.name, score: best.score } : null });
    }
  }

  console.log(`\n=== CONFIRMED MATCHES (${confirmed.length}/${ARCHITECT_COURSES.length}) ===`);
  for (const c of confirmed) {
    console.log(`  ${c.entry.name} (${c.entry.architect}) → "${c.courseName}" (${(c.score * 100).toFixed(0)}% match)`);
  }

  console.log(`\n=== NEEDS REVIEW (${needsReview.length}/${ARCHITECT_COURSES.length}) ===`);
  for (const r of needsReview) {
    console.log(
      `  ${r.entry.name} (${r.entry.city}, ${r.entry.stateAbbr}) — best candidate: ${
        r.best ? `"${r.best.name}" (${(r.best.score * 100).toFixed(0)}%)` : "none found"
      }`
    );
  }

  if (process.argv.includes("--apply")) {
    console.log(`\nApplying is_notable_architect=true to ${confirmed.length} confirmed courses...`);
    for (const c of confirmed) {
      const { error } = await supabase.from("courses").update({ is_notable_architect: true }).eq("id", c.courseId);
      if (error) console.error(`  Failed for ${c.courseName}:`, error.message);
    }
    console.log("Done.");
  } else {
    console.log("\n(dry run — pass --apply to actually write is_notable_architect=true for confirmed matches)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
