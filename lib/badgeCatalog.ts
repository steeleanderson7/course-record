import badgesData from "@/data/badges.json";

export type Tier = {
  key: string;
  name: string;
  ring_color: string;
  order: number;
};

export type Badge = {
  id: string;
  family_id: string;
  category: string;
  icon: string;
  tier: number;
  tier_name: string;
  title: string;
  metric: string;
  threshold: number;
  criteria_text: string;
  description: string;
};

export type BadgeCatalog = {
  version: number;
  tiers: Tier[];
  badges: Badge[];
};

const catalog = badgesData as BadgeCatalog;

export const TIERS: Tier[] = [...catalog.tiers].sort((a, b) => a.order - b.order);
export const ALL_BADGES: Badge[] = catalog.badges;

// Not present as its own field in badges.json (each badge's own `title` is
// its tier-specific name, e.g. "Road Tripper" for states-played's Bronze
// tier) — these are the family-level card headings from the design
// reference (courserecord-badges.html), hardcoded once here since they're
// pure display copy, not derivable from the data.
export const FAMILY_TITLES: Record<string, string> = {
  "states-played": "States Played",
  "countries-played": "Countries Played",
  "rounds-played": "Rounds Played",
  "top-100-played": "Top 100 Courses Played",
  "tpc-played": "TPC Properties Played",
  "private-clubs-played": "Private Country Clubs Played",
  "municipal-played": "Public & Municipal Courses Played",
  "resort-played": "Resort Courses Played",
  "links-played": "Links & Coastal Courses Played",
  "mountain-played": "Mountain Courses Played",
  "desert-played": "Desert Courses Played",
  "tropical-played": "Tropical Courses Played",
  "architect-played": "Famous-Architect Courses Played",
  "records-held": "Course Records Held",
  "records-defended": "Course Records Defended",
  "records-claimed": "Course Records Claimed",
  birdies: "Birdies Logged",
  eagles: "Eagles & Better Logged",
  aces: "Holes-in-One Logged",
  streak: "Active Streak",
};

// Category display order matches the reference's filter-pill row.
export const CATEGORY_ORDER = ["Exploration", "Terrain", "Design", "Territory", "Scoring", "Consistency"];

function groupByFamily(): Map<string, Badge[]> {
  const map = new Map<string, Badge[]>();
  for (const badge of ALL_BADGES) {
    const list = map.get(badge.family_id) ?? [];
    list.push(badge);
    map.set(badge.family_id, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.tier - b.tier);
  return map;
}

export const BADGES_BY_FAMILY = groupByFamily();

export type TierProgress = {
  tier: number;
  tierName: string;
  title: string;
  threshold: number;
  ringColor: string;
  icon: string;
  earned: boolean;
};

export type FamilyProgress = {
  familyId: string;
  category: string;
  familyTitle: string;
  icon: string;
  currentValue: number;
  earnedCount: number;
  tiers: TierProgress[];
  /** e.g. "5 of 10 states played in · 5 more for Cross-Country (Silver)", or
   *  "250 lifetime rounds logged · All tiers earned" once maxed out. */
  caption: string;
};

const ringColorByTierName = new Map(TIERS.map((t) => [t.name, t.ring_color]));

/** Strips the badge's own criteria_text ("5+ states played in") down to the
 *  reusable phrase ("states played in") so the live caption can splice in
 *  the actual current/target numbers instead of the static "5+". */
function criteriaPhrase(criteriaText: string): string {
  return criteriaText.replace(/^\d+\+\s*/, "");
}

/**
 * Pure function of a metric-value map (typically from get_player_metrics)
 * — one entry per family (20 total, fixed regardless of input). A family
 * whose metric never appears in `metrics` (locked families with no backing
 * data yet) naturally renders fully locked at 0 — no special-casing needed.
 */
export function buildFamilyProgress(metrics: Record<string, number>): FamilyProgress[] {
  const families: FamilyProgress[] = [];

  for (const [familyId, badges] of BADGES_BY_FAMILY) {
    const metricKey = badges[0].metric;
    const currentValue = metrics[metricKey] ?? 0;

    const tiers: TierProgress[] = badges.map((b) => ({
      tier: b.tier,
      tierName: b.tier_name,
      title: b.title,
      threshold: b.threshold,
      ringColor: ringColorByTierName.get(b.tier_name) ?? "#B08D57",
      icon: b.icon,
      earned: currentValue >= b.threshold,
    }));

    const earnedCount = tiers.filter((t) => t.earned).length;
    const nextTier = tiers.find((t) => !t.earned) ?? null;
    const phrase = criteriaPhrase(badges[0].criteria_text);

    const caption = nextTier
      ? `${currentValue} of ${nextTier.threshold} ${phrase} · ${nextTier.threshold - currentValue} more for ${nextTier.title} (${nextTier.tierName})`
      : `${currentValue} ${phrase} · All tiers earned`;

    families.push({
      familyId,
      category: badges[0].category,
      familyTitle: FAMILY_TITLES[familyId] ?? familyId,
      icon: badges[0].icon,
      currentValue,
      earnedCount,
      tiers,
      caption,
    });
  }

  return families;
}
