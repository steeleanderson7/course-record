"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { Badge } from "@/lib/badgeCatalog";
import { BadgeEarnedOverlay } from "@/components/badges/BadgeEarnedOverlay";

export type EarnedBadgeEvent = { badge: Badge; totalEarnedCount: number };

type CelebrationContextValue = {
  pushEarnedBadges: (events: EarnedBadgeEvent[]) => void;
};

const BadgeCelebrationContext = createContext<CelebrationContextValue | null>(null);

/** Call after any action that might earn a badge (currently just
 *  createRound) — pass its newlyEarnedBadges/totalEarnedCount straight
 *  through. No-ops cleanly if the array is empty, so callers don't need to
 *  check first. */
export function useBadgeCelebration(): CelebrationContextValue {
  const ctx = useContext(BadgeCelebrationContext);
  if (!ctx) throw new Error("useBadgeCelebration must be used within BadgeCelebrationProvider");
  return ctx;
}

/**
 * Mounted once in the root layout, above {children} — a React Context
 * survives a client-side App Router navigation (e.g. /log-round/score →
 * /log-round/result) because the root layout itself never re-executes on
 * that transition, only the nested page content swaps out. That's what
 * lets a badge earned mid-action still celebrate on whatever page the
 * round-logging flow lands on next, with no special handling needed on
 * that destination page.
 */
export function BadgeCelebrationProvider({
  viewerId,
  children,
}: {
  viewerId: string | null;
  children: React.ReactNode;
}) {
  const [queue, setQueue] = useState<EarnedBadgeEvent[]>([]);

  const pushEarnedBadges = useCallback((events: EarnedBadgeEvent[]) => {
    if (events.length === 0) return;
    setQueue((q) => [...q, ...events]);
  }, []);

  // "Keep playing" — show the next queued badge, if any.
  const dismissCurrent = useCallback(() => {
    setQueue((q) => q.slice(1));
  }, []);

  // "View in Collection" — the destination page already shows every badge
  // just earned, so there's no need to re-surface the rest of the queue
  // when they come back.
  const dismissAll = useCallback(() => {
    setQueue([]);
  }, []);

  return (
    <BadgeCelebrationContext.Provider value={{ pushEarnedBadges }}>
      {children}
      {queue[0] && (
        <BadgeEarnedOverlay
          key={queue[0].badge.id}
          event={queue[0]}
          viewerId={viewerId}
          onKeepPlaying={dismissCurrent}
          onViewCollection={dismissAll}
        />
      )}
    </BadgeCelebrationContext.Provider>
  );
}
