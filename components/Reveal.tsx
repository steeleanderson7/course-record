"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  /** Stagger delay in ms, for lists where each item reveals slightly after the previous. */
  delay?: number;
  className?: string;
};

/**
 * Fades/slides content in once it scrolls into view (or immediately if
 * already on-screen at mount, e.g. above the fold). Uses tw-animate-css's
 * animate-in utilities rather than hand-rolled keyframes, and respects
 * prefers-reduced-motion via the motion-safe: variant — reduced-motion
 * users just see the content, no animation.
 */
export function Reveal({ children, delay = 0, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${visible ? "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3" : "opacity-0"} fill-mode-both ${className ?? ""}`}
      style={visible ? { animationDelay: `${delay}ms`, animationDuration: "500ms" } : undefined}
    >
      {children}
    </div>
  );
}
