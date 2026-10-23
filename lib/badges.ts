import type { LucideIcon } from "lucide-react";
import { Shield, TrendingUp, Star, MapPin, Flag, Target, Crown, Gem } from "lucide-react";

/**
 * The 9-badge collection from courserecord-profile.html. Criteria for
 * several of these aren't specified in the handoff — documented best
 * guesses below, easy to retune once real usage data exists:
 *
 * - "Marquee Hunter" (reference: "Played Augusta National" — one specific
 *   flagship course) and "Grand Slam" (play all 4 major-championship
 *   venues) both need a curated course list the user hasn't sent yet —
 *   left as permanently-unearnable placeholders (never throw, just never
 *   satisfied) until FLAGSHIP_COURSE_ID / MAJOR_VENUE_IDS below are filled
 *   in.
 * - "Perfect Round" — reference shows a specific best score-to-par, not a
 *   fixed threshold; interpreted here as "broke par at least once."
 */
export type BadgeStats = {
  recordsHeld: number;
  roundsPlayed: number;
  marqueeCoursesPlayed: number;
  statesPlayed: number;
  points: number;
  bestScoreToPar: number | null;
  playedFlagshipCourse: boolean;
  playedAllMajorVenues: boolean;
};

export type BadgeDef = {
  id: string;
  name: string;
  icon: LucideIcon;
  description: (stats: BadgeStats) => string;
  earned: (stats: BadgeStats) => boolean;
};

export const BADGE_COLLECTION: BadgeDef[] = [
  {
    id: "first-record",
    name: "First Record",
    icon: Shield,
    description: () => "Earned your first course record",
    earned: (s) => s.recordsHeld >= 1,
  },
  {
    id: "century-club",
    name: "Century Club",
    icon: TrendingUp,
    description: (s) => `${s.roundsPlayed} rounds logged`,
    earned: (s) => s.roundsPlayed >= 100,
  },
  {
    id: "top-100-club",
    name: "Top 100 Club",
    icon: Star,
    description: (s) => `${s.marqueeCoursesPlayed} marquee course${s.marqueeCoursesPlayed === 1 ? "" : "s"} played`,
    earned: (s) => s.marqueeCoursesPlayed >= 1,
  },
  {
    id: "globetrotter",
    name: "Globetrotter",
    icon: MapPin,
    description: (s) => `${s.statesPlayed} states played`,
    earned: (s) => s.statesPlayed >= 5,
  },
  {
    id: "marquee-hunter",
    name: "Marquee Hunter",
    icon: Flag,
    description: () => "Played a flagship marquee course",
    earned: (s) => s.playedFlagshipCourse,
  },
  {
    id: "perfect-round",
    name: "Perfect Round",
    icon: Target,
    description: (s) => (s.bestScoreToPar != null ? `Best: ${s.bestScoreToPar} to par` : "Break par in a round"),
    earned: (s) => s.bestScoreToPar != null && s.bestScoreToPar < 0,
  },
  {
    id: "top-100-club-silver",
    name: "Top 100 Club — Silver",
    icon: Star,
    description: (s) => `${s.marqueeCoursesPlayed} of 10 marquee courses played`,
    earned: (s) => s.marqueeCoursesPlayed >= 10,
  },
  {
    id: "scratch",
    name: "Scratch",
    icon: Crown,
    description: () => "Reached the Scratch tier",
    earned: (s) => s.points >= 10_000,
  },
  {
    id: "grand-slam",
    name: "Grand Slam",
    icon: Gem,
    description: () => "Played all 4 major-championship venues",
    earned: (s) => s.playedAllMajorVenues,
  },
];
