/**
 * One-time seed: flags `courses.is_tpc = true` for real courses in our
 * database that belong to the PGA TOUR's TPC (Tournament Players Club)
 * network — drives the tpc-played badge family (data/badges.json).
 *
 * Same fuzzy-matching approach as scripts/seed-marquee-courses.ts (see that
 * file's header comment for the full rationale) — the list below is a
 * curated set of well-known, currently-TPC-branded US courses compiled from
 * public knowledge rather than an external CSV, since (unlike the Golf
 * Digest Top 100) there's no single external ranked source to parse.
 * Deliberately conservative: several historical "TPC" properties have since
 * been sold and rebranded away from TPC ownership, so this only includes
 * courses I'm confident are still actively TPC-branded today. International
 * TPC courses (e.g. TPC Kuala Lumpur) are left out — the state-mismatch
 * disqualifier below only knows US state boundaries.
 *
 * Prints a full match report. Only applies the `is_tpc` update for matches
 * at or above CONFIDENT_THRESHOLD; everything else is listed under "NEEDS
 * REVIEW" and left untouched.
 */
import { createClient } from "@supabase/supabase-js";
import { findState } from "../lib/geo/us-projection";
import { STATE_ABBREVIATIONS } from "../lib/geo/us-states";

const CONFIDENT_THRESHOLD = 0.55;

type CuratedEntry = { name: string; city: string; stateAbbr: string };

const TPC_COURSES: CuratedEntry[] = [
  { name: "TPC Sawgrass", city: "Ponte Vedra Beach", stateAbbr: "FL" },
  { name: "TPC Scottsdale", city: "Scottsdale", stateAbbr: "AZ" },
  { name: "TPC Boston", city: "Norton", stateAbbr: "MA" },
  { name: "TPC River Highlands", city: "Cromwell", stateAbbr: "CT" },
  { name: "TPC Southwind", city: "Memphis", stateAbbr: "TN" },
  { name: "TPC San Antonio", city: "San Antonio", stateAbbr: "TX" },
  { name: "TPC Potomac at Avenel Farm", city: "Potomac", stateAbbr: "MD" },
  { name: "TPC Louisiana", city: "Avondale", stateAbbr: "LA" },
  { name: "TPC Summerlin", city: "Las Vegas", stateAbbr: "NV" },
  { name: "TPC Twin Cities", city: "Blaine", stateAbbr: "MN" },
  { name: "TPC Colorado", city: "Berthoud", stateAbbr: "CO" },
  { name: "TPC Deere Run", city: "Silvis", stateAbbr: "IL" },
  { name: "TPC Harding Park", city: "San Francisco", stateAbbr: "CA" },
  { name: "TPC Craig Ranch", city: "McKinney", stateAbbr: "TX" },
  { name: "TPC Myrtle Beach", city: "Murrells Inlet", stateAbbr: "SC" },
  { name: "TPC Las Vegas", city: "Las Vegas", stateAbbr: "NV" },
  { name: "TPC Las Colinas", city: "Irving", stateAbbr: "TX" },
  { name: "TPC Tampa Bay", city: "Lutz", stateAbbr: "FL" },
];

/**
 * Confirmed from the first dry run against production:
 * - TPC Louisiana: OSM has this course tagged under its full formal name
 *   "Tournament Players Club of Louisiana" rather than the common "TPC"
 *   abbreviation, which the bigram matcher scores too low (40%) to pick up
 *   automatically. Confirmed via its coordinates (29.8994, -90.1933 — the
 *   Avondale/New Orleans area) matching TPC Louisiana's real location.
 */
const MANUAL_OVERRIDES: Record<string, string> = {
  "TPC Louisiana": "3416c85b-112f-4719-920a-be3f9a8c939e", // "Tournament Players Club of Louisiana"
};
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

  for (const entry of TPC_COURSES) {
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

  console.log(`\n=== CONFIRMED MATCHES (${confirmed.length}/${TPC_COURSES.length}) ===`);
  for (const c of confirmed) {
    console.log(`  ${c.entry.name} → "${c.courseName}" (${(c.score * 100).toFixed(0)}% match)`);
  }

  console.log(`\n=== NEEDS REVIEW (${needsReview.length}/${TPC_COURSES.length}) ===`);
  for (const r of needsReview) {
    console.log(
      `  ${r.entry.name} (${r.entry.city}, ${r.entry.stateAbbr}) — best candidate: ${
        r.best ? `"${r.best.name}" (${(r.best.score * 100).toFixed(0)}%)` : "none found"
      }`
    );
  }

  if (process.argv.includes("--apply")) {
    console.log(`\nApplying is_tpc=true to ${confirmed.length} confirmed courses...`);
    for (const c of confirmed) {
      const { error } = await supabase.from("courses").update({ is_tpc: true }).eq("id", c.courseId);
      if (error) console.error(`  Failed for ${c.courseName}:`, error.message);
    }
    console.log("Done.");
  } else {
    console.log("\n(dry run — pass --apply to actually write is_tpc=true for confirmed matches)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
