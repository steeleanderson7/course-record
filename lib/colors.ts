// Canonical friend color coding — see
// courserecord-handoff-heritage/README.md "Canonical friend color coding".
// The logged-in user always gets gold (the brand's "you" color); everyone
// else hash-rotates through the rest of the palette so a given friend's
// color stays stable across sessions without needing to persist it.
export const BRAND_COLORS = {
  fairway: "#1B4332",
  fairwayDeep: "#0F2A1F",
  cream: "#F6F1E4",
  gold: "#C9A227",
  ink: "#16281F",
  muted: "#5B6C60",
  unclaimed: "#9FAFA3",
} as const;

const YOU_COLOR = BRAND_COLORS.gold;

const FRIEND_PALETTE = [
  "#6E7B91", // slate (Taylor)
  "#8A9A3B", // olive (Jordan)
  "#8C6239", // clay (Sam)
  "#B3785C", // tan-brown
  "#5B8C78", // teal
];

/**
 * Deterministic color per user id, stable across renders/sessions. The
 * current viewer always gets gold; everyone else hash-rotates through the
 * rest of the brand palette.
 */
export function colorForUser(userId: string, currentUserId: string): string {
  if (userId === currentUserId) return YOU_COLOR;

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return FRIEND_PALETTE[hash % FRIEND_PALETTE.length];
}
