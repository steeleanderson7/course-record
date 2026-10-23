// Tier ladder + scoring — see courserecord-handoff-heritage/README.md
// "Points, levels, and badges". Thresholds are calibrated against the
// reference's own demo data point: Avery at "Low Handicap", 7,350 pts,
// 2,650 pts to Scratch — i.e. Scratch starts at exactly 10,000.
export const POINTS = {
  perRound: 50,
  perRecordHeld: 100,
  perMarqueeCourse: 200,
};

export type LevelTier = { name: string; threshold: number };

export const LEVEL_TIERS: LevelTier[] = [
  { name: "Rookie", threshold: 0 },
  { name: "Weekend Warrior", threshold: 1000 },
  { name: "Club Champion", threshold: 3000 },
  { name: "Low Handicap", threshold: 6000 },
  { name: "Scratch", threshold: 10000 },
  { name: "Tour Pro", threshold: 15000 },
];

export function levelForPoints(points: number) {
  let current = LEVEL_TIERS[0];
  let next: LevelTier | null = null;
  for (const tier of LEVEL_TIERS) {
    if (points >= tier.threshold) current = tier;
    else {
      next = tier;
      break;
    }
  }
  const progress = next
    ? (points - current.threshold) / (next.threshold - current.threshold)
    : 1;
  return {
    current,
    next,
    pointsToNext: next ? next.threshold - points : 0,
    progress: Math.max(0, Math.min(1, progress)),
  };
}
