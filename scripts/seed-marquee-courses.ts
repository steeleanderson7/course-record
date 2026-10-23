/**
 * One-time seed: flags `courses.is_marquee = true` for real courses in our
 * database that match the Golf Digest Top 100 (supabase/top-100-source.csv).
 *
 * Why fuzzy matching, not exact: our course names come verbatim from OSM
 * tagging, which doesn't always match Golf Digest's naming — e.g. multiple
 * courses at one facility ("Winged Foot Golf Club (West)", "Bandon Dunes
 * Resort (Pacific Dunes)") are usually tagged in OSM under the individual
 * course's own name, not the parenthetical club+qualifier form Golf Digest
 * uses. For each entry this tries several candidate search terms (the full
 * name, the name with the parenthetical qualifier stripped, and the
 * qualifier itself when it looks like a course name), scores candidates by
 * string similarity, and requires the candidate's real lat/lon to fall
 * inside the expected US state (via the same point-in-polygon lookup used
 * by the territory map) before accepting a match — state mismatch is an
 * automatic disqualifier regardless of name similarity.
 *
 * Prints a full match report. Only applies the `is_marquee` update for
 * matches at or above CONFIDENT_THRESHOLD; everything else is listed under
 * "NEEDS REVIEW" and left untouched.
 */
import { createClient } from "@supabase/supabase-js";
import { findState } from "../lib/geo/us-projection";
import { STATE_ABBREVIATIONS } from "../lib/geo/us-states";
import fs from "fs";

const CONFIDENT_THRESHOLD = 0.55;

/**
 * Manually confirmed via live web search (not the fuzzy matcher), for two
 * cases where the real course is mistagged/informally named in OSM
 * (private, exclusive clubs tend to be under-mapped) and the algorithm
 * either couldn't find it or ranked an unrelated, same-state course higher
 * on raw trigram similarity:
 * - Pine Valley GC (NJ): web search gives its real address/coords as
 *   1 E Atlantic Ave, Pine Valley, NJ — 39.7920193, -74.9722406. OSM's
 *   "Pine Valley Country Club" sits at 39.7878968, -74.9716827, ~0.3 miles
 *   away (well within normal clubhouse-vs-course-centroid tagging
 *   variance) — confirmed as the same facility, just informally named. A
 *   *different*, unrelated "Pine Valley Golf Club" exists in Ohio and the
 *   algorithm had wrongly preferred it on exact name match alone.
 * - California Golf Club: web search confirms "California Golf Club of
 *   San Francisco" at 844 W Orange Ave, South San Francisco, CA — exact
 *   name and city match to our OSM candidate — but it scored below an
 *   unrelated "California Oaks Golf Club" on raw trigram similarity since
 *   both merely share the word "California".
 */
const MANUAL_OVERRIDES: Record<string, string> = {
  "Pine Valley Golf Club": "c3f5f2d4-54db-497a-976c-45b3803d3290", // "Pine Valley Country Club", Pine Valley, NJ
  "California Golf Club": "8cdc9ebb-01cc-44d2-8099-51ff44fb66dc", // "California Golf Club of San Francisco"
};

/**
 * Confirmed-wrong via web search, forced to NEEDS REVIEW regardless of
 * what the algorithm finds: "Ladera Golf Club" (Thermal, CA) is a real,
 * distinct, ultra-private course that opened in 2023 — likely just not in
 * OSM yet given how new/private it is. The algorithm's best candidate,
 * "Maderas Golf Club", is confirmed to be a real but unrelated course in
 * Poway, CA — ~100+ miles away, just a coincidental name/state match.
 */
const MANUAL_EXCLUSIONS = new Set(["Ladera Golf Club"]);

const ABBR_TO_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_ABBREVIATIONS).map(([name, abbr]) => [abbr, name])
);

type DigestEntry = { rank: number; name: string; city: string; stateAbbr: string };

function parseCsv(path: string): DigestEntry[] {
  const lines = fs.readFileSync(path, "utf-8").trim().split("\n").slice(1);
  return lines.map((line) => {
    const [rank, name, city, stateAbbr] = line.split(",");
    return { rank: Number(rank), name: name.trim(), city: city.trim(), stateAbbr: stateAbbr.trim() };
  });
}

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

// Postgres trigram similarity() penalizes length differences, so an exact
// short OSM name like "Erin Hills" scores *lower* against the longer Golf
// Digest form "Erin Hills Golf Course" than unrelated same-length names do
// — stripping the generic trailing qualifier gives the real match a fair
// shot at a near-1.0 score against its own short form.
const GENERIC_SUFFIX = /\s+(golf (course|club|links|resort)|country club|resort|club)\s*$/i;
function stripGenericSuffix(name: string): string | null {
  const stripped = name.replace(GENERIC_SUFFIX, "").trim();
  return stripped !== name.trim() && stripped.length > 2 ? stripped : null;
}

function candidateSearchTerms(fullName: string): string[] {
  const terms = new Set<string>();
  terms.add(fullName);
  const parenMatch = fullName.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  let base = fullName;
  if (parenMatch) {
    const [, matchedBase, qualifier] = parenMatch;
    base = matchedBase.trim();
    terms.add(base);
    // The qualifier alone ("Pacific Dunes") is often the actual OSM name
    // for a specific course at a multi-course resort.
    if (qualifier.split(" ").length <= 4) terms.add(qualifier.trim());
  }
  const stripped = stripGenericSuffix(base);
  if (stripped) terms.add(stripped);
  return [...terms];
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const entries = parseCsv(process.argv[2]);

  const confirmed: { entry: DigestEntry; courseId: string; courseName: string; score: number }[] = [];
  const needsReview: { entry: DigestEntry; best: { name: string; score: number } | null }[] = [];

  for (const entry of entries) {
    if (MANUAL_OVERRIDES[entry.name]) {
      confirmed.push({
        entry,
        courseId: MANUAL_OVERRIDES[entry.name],
        courseName: "(manual override — see MANUAL_OVERRIDES comment)",
        score: 1,
      });
      continue;
    }

    const expectedState = ABBR_TO_STATE[entry.stateAbbr];
    const terms = candidateSearchTerms(entry.name);

    // Trigram-ranked search per candidate term — returns the *most similar*
    // rows first, so a common word can't silently bump the real match out
    // of a limited result set the way plain ILIKE did.
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

  console.log(`\n=== CONFIRMED MATCHES (${confirmed.length}/${entries.length}) ===`);
  for (const c of confirmed) {
    console.log(
      `  #${c.entry.rank} ${c.entry.name} → "${c.courseName}" (${(c.score * 100).toFixed(0)}% match)`
    );
  }

  console.log(`\n=== NEEDS REVIEW (${needsReview.length}/${entries.length}) ===`);
  for (const r of needsReview) {
    console.log(
      `  #${r.entry.rank} ${r.entry.name} (${r.entry.city}, ${r.entry.stateAbbr}) — best candidate: ${
        r.best ? `"${r.best.name}" (${(r.best.score * 100).toFixed(0)}%)` : "none found"
      }`
    );
  }

  if (process.argv.includes("--apply")) {
    console.log(`\nApplying is_marquee=true to ${confirmed.length} confirmed courses...`);
    for (const c of confirmed) {
      const { error } = await supabase.from("courses").update({ is_marquee: true }).eq("id", c.courseId);
      if (error) console.error(`  Failed for ${c.courseName}:`, error.message);
    }
    console.log("Done.");
  } else {
    console.log("\n(dry run — pass --apply to actually write is_marquee=true for confirmed matches)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
