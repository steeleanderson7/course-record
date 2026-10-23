"use client";

import { useEffect, useState } from "react";
import { ShieldHalf } from "lucide-react";
import { levelForPoints } from "@/lib/levels";
import { AnimatedNumber } from "@/components/AnimatedNumber";

export function LevelProgress({ points, compact }: { points: number; compact?: boolean }) {
  const { current, next, pointsToNext, progress } = levelForPoints(points);

  // Starts at 0 and grows to the real width just after mount, so the bar
  // visibly fills rather than just appearing — same "earned, not printed"
  // feel as the animated point counter.
  const [barWidth, setBarWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setBarWidth(progress * 100), 50);
    return () => clearTimeout(t);
  }, [progress]);

  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-7">
      <div className="flex items-center gap-2.5">
        <ShieldHalf className="h-5 w-5 text-primary" strokeWidth={2} />
        <p className={`font-heading flex-1 font-bold ${compact ? "text-lg" : "text-xl"}`}>{current.name}</p>
        <p className="font-semibold text-primary">
          <AnimatedNumber value={points} /> pts
        </p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${Math.round(barWidth)}%` }}
        />
      </div>
      {next && (
        <p className="text-sm text-muted-foreground">
          {pointsToNext.toLocaleString()} pts to {next.name}
        </p>
      )}
    </div>
  );
}
