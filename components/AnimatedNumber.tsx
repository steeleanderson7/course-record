"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up from 0 to `value` on mount — used for points/stats so they feel earned, not just printed. */
export function AnimatedNumber({
  value,
  durationMs = 900,
  formatter = (n) => Math.round(n).toLocaleString(),
}: {
  value: number;
  durationMs?: number;
  formatter?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (prefersReducedMotion.current) {
      setDisplay(value);
      return;
    }
    let frame: number;
    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <>{formatter(display)}</>;
}
