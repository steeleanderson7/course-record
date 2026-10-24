"use client";

import { useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { TIERS } from "@/lib/badgeCatalog";
import { BRAND_COLORS } from "@/lib/colors";
import type { EarnedBadgeEvent } from "@/components/badges/BadgeCelebrationProvider";

const TOTAL_BADGES = 100;

// Matches the design reference's confetti palette — brand colors plus the
// friend-color palette already used elsewhere (slate/olive/clay), so a
// celebration never introduces a color that looks out of place next to the
// rest of the app.
const CONFETTI_COLORS = [BRAND_COLORS.gold, BRAND_COLORS.fairway, "#4FC3CE", "#8A9A3B", "#6E7B91", "#8C6239", BRAND_COLORS.cream];
const CONFETTI_COUNT = 70;

type ConfettiPiece = {
  left: number;
  width: number;
  height: number;
  color: string;
  shape: "circle" | "rect";
  delay: number;
  duration: number;
  rot0: number;
  rot1: number;
  sway: number;
  fall: number;
};

function generateConfetti(seed: number): ConfettiPiece[] {
  // Re-rolled once per badge shown (keyed by the overlay's own React key in
  // BadgeCelebrationProvider, not re-rolled on every re-render) — baking
  // every randomized value into the array up front is what keeps React from
  // treating pieces as new elements and restarting their animation
  // mid-flight if this component ever re-renders for an unrelated reason.
  void seed;
  return Array.from({ length: CONFETTI_COUNT }, () => ({
    left: Math.random() * 100,
    width: 6 + Math.random() * 4,
    height: 10 + Math.random() * 6,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    shape: Math.random() > 0.5 ? "circle" : "rect",
    delay: Math.random() * 1.1,
    duration: 2.6 + Math.random() * 1.6,
    rot0: -60 + Math.random() * 120,
    rot1: (Math.random() > 0.5 ? 1 : -1) * (280 + Math.random() * 280),
    sway: -80 + Math.random() * 160,
    fall: 104 + Math.random() * 18,
  }));
}

export function BadgeEarnedOverlay({
  event,
  viewerId,
  onKeepPlaying,
  onViewCollection,
}: {
  event: EarnedBadgeEvent;
  viewerId: string | null;
  onKeepPlaying: () => void;
  onViewCollection: () => void;
}) {
  const { badge, totalEarnedCount } = event;
  const ringColor = useMemo(
    () => TIERS.find((t) => t.name === badge.tier_name)?.ring_color ?? BRAND_COLORS.gold,
    [badge.tier_name]
  );
  // Keyed by the badge id via the parent's React `key` prop (see
  // BadgeCelebrationProvider) — this component fully remounts per badge, so
  // a plain useMemo with no deps is correct: it only ever runs once per
  // badge shown, never re-rolls mid-celebration.
  const confetti = useMemo(() => generateConfetti(0), []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-6 motion-safe:animate-in motion-safe:fade-in"
      style={{ backgroundColor: "rgba(22,40,31,0.6)", animationDuration: "250ms" }}
      onClick={onKeepPlaying}
      role="dialog"
      aria-modal="true"
      aria-label={`Badge earned: ${badge.title}`}
    >
      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
        {confetti.map((p, i) => (
          <span
            key={i}
            className="absolute top-[-24px] animate-confetti-fall opacity-0"
            style={
              {
                left: `${p.left}%`,
                width: `${p.width}px`,
                height: `${p.height}px`,
                backgroundColor: p.color,
                borderRadius: p.shape === "circle" ? "50%" : "2px",
                "--rot0": `${p.rot0}deg`,
                "--rot1": `${p.rot1}deg`,
                "--sway": `${p.sway}px`,
                "--fall": `${p.fall}vh`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div
        className="relative z-[2] w-full max-w-[400px] rounded-[20px] px-10 pt-11 pb-9 text-center shadow-[0_24px_60px_rgba(22,40,31,0.35)] animate-badge-card-pop"
        style={{ backgroundColor: BRAND_COLORS.cream }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute top-7 left-1/2 h-[200px] w-[200px] -translate-x-1/2 rounded-full animate-badge-glow-pulse"
          style={{ background: "radial-gradient(circle, rgba(201,162,39,0.35) 0%, rgba(201,162,39,0) 70%)" }}
        />
        <Sparkle className="top-[18px] left-[34px] animate-sparkle-twinkle" size={22} delay="0.5s" />
        <Sparkle className="top-[46px] right-[30px] animate-sparkle-twinkle" size={16} delay="0.9s" />
        <Sparkle className="top-[120px] left-[52px] animate-sparkle-twinkle" size={12} delay="1.2s" />

        <div className="relative flex flex-col items-center gap-3.5">
          <span
            className="font-heading text-[14px] font-medium tracking-wide uppercase italic"
            style={{ color: BRAND_COLORS.gold }}
          >
            Badge Earned
          </span>

          <svg
            width="116"
            height="116"
            viewBox="0 0 56 56"
            aria-hidden="true"
            className="animate-badge-icon-pop"
            style={{ animationDelay: "0.32s" }}
          >
            <circle cx={28} cy={28} r={25.5} fill={BRAND_COLORS.cream} stroke={ringColor} strokeWidth={3} />
            <g transform="translate(16,16)">
              <use href={`/badge-icons.svg#icon-${badge.icon}`} width={24} height={24} />
            </g>
          </svg>

          <div className="mt-0.5 flex flex-col gap-0.5">
            <span className="text-[11px] font-bold tracking-wide uppercase" style={{ color: ringColor }}>
              {badge.tier_name}
            </span>
            <span className="font-heading text-[26px] font-bold" style={{ color: BRAND_COLORS.ink }}>
              {badge.title}
            </span>
          </div>
          <span className="max-w-[280px] text-sm" style={{ color: BRAND_COLORS.muted }}>
            {badge.criteria_text}
          </span>
          <span
            className="mt-0.5 rounded-full px-3.5 py-1.5 text-xs font-semibold"
            style={{ color: BRAND_COLORS.gold, backgroundColor: "rgba(201,162,39,0.12)" }}
          >
            {totalEarnedCount} of {TOTAL_BADGES} badges collected
          </span>

          <div className="mt-4.5 flex w-full flex-col gap-2.5">
            {viewerId && (
              <Link
                href={`/profile/${viewerId}/badges#family-${badge.family_id}`}
                onClick={onViewCollection}
                className="flex w-full items-center justify-center rounded-[10px] px-7 py-3 text-sm font-bold"
                style={{ backgroundColor: BRAND_COLORS.fairway, color: BRAND_COLORS.cream }}
              >
                View in Collection
              </Link>
            )}
            <button
              onClick={onKeepPlaying}
              className="p-1.5 text-[13px] font-semibold"
              style={{ color: BRAND_COLORS.muted }}
            >
              Keep playing
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Sparkle({ className, size, delay }: { className: string; size: number; delay: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-11 -11 22 22"
      className={`absolute ${className}`}
      style={{ animationDelay: delay }}
      aria-hidden="true"
    >
      <path
        d="M0,-11 L2.4,-3.6 L10,0 L2.4,3.6 L0,11 L-2.4,3.6 L-10,0 L-2.4,-3.6 Z"
        fill={BRAND_COLORS.gold}
      />
    </svg>
  );
}
