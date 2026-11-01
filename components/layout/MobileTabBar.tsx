"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, Trophy, UserRound, Plus } from "lucide-react";

const leftLinks = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/map", label: "Map", icon: Map },
];

/**
 * Fixed bottom tab bar, phones only (`md:hidden`) — a hamburger menu would
 * bury "Log a Round" behind a tap, so instead the 4 nav destinations split
 * around a raised center button for it, the same "FAB breaks out of the
 * bar" pattern sports-tracking apps (Strava etc.) use for their own primary
 * action, and the exact 5-item set (Home/Map/Log a Round/Leaderboard/
 * Profile) specified in the mobile design handoff. Rendered from within
 * NavBar.tsx, which already computes whether this is a signed-in,
 * non-bespoke-header route and now also passes the viewer's own id down
 * for the Profile tab's link — this component itself only needs
 * `usePathname()` for active-state highlighting, the same client-only
 * concern NavLinks.tsx already has for the desktop nav.
 *
 * z-40: confirmed safe against the app's two other fixed-position layers —
 * the badge-earned celebration overlay (z-[999]) and the shadcn Dialog
 * (z-50) — so both always render on top of this bar, never under it.
 */
export function MobileTabBar({ viewerId }: { viewerId: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname?.startsWith(href);
  const rightLinks = [
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: `/profile/${viewerId}`, label: "Profile", icon: UserRound },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-card md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {leftLinks.map((link) => (
        <TabLink key={link.href} {...link} active={!!isActive(link.href)} />
      ))}

      <Link
        href="/log-round"
        className="hover-lift relative -top-4 flex h-14 w-14 flex-none items-center justify-center self-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_16px_rgba(0,0,0,0.25)]"
        aria-label="Log a Round"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </Link>

      {rightLinks.map((link) => (
        <TabLink key={link.href} {...link} active={!!isActive(link.href)} />
      ))}
    </nav>
  );
}

function TabLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-semibold ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
      {label}
    </Link>
  );
}
