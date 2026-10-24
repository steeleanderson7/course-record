import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/StatTile";
import { LevelProgress } from "@/components/LevelProgress";
import { Reveal } from "@/components/Reveal";
import { requireActiveGroup } from "@/lib/supabase/guards";
import { getFullProfile, getUserGroupsDetailed } from "@/lib/queries";
import { BADGE_COLLECTION, type BadgeStats } from "@/lib/badges";
import { BRAND_COLORS } from "@/lib/colors";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, group } = await requireActiveGroup();
  const isSelf = id === user.id;
  const { profile, recordsHeldInGroup, lifetime, bestScoreToPar } = await getFullProfile(
    supabase,
    group.id,
    id,
    isSelf
  );
  if (!profile) notFound();

  // Which groups you're in + your rank in each — self-view only, since
  // showing someone else's full group membership list (even just names)
  // would leak which private friend groups they belong to beyond the one
  // you share with them.
  const groupStandings = isSelf ? await getUserGroupsDetailed(supabase, id, group.id) : [];

  const badgeStats: BadgeStats = {
    recordsHeld: lifetime.recordsHeld,
    roundsPlayed: lifetime.roundsPlayed,
    marqueeCoursesPlayed: lifetime.marqueeCoursesPlayed,
    statesPlayed: lifetime.statesPlayed,
    points: lifetime.points,
    bestScoreToPar,
    playedFlagshipCourse: false, // pending the curated Top 100/marquee list
    playedAllMajorVenues: false, // pending the curated Top 100/marquee list
  };
  const earnedCount = BADGE_COLLECTION.filter((b) => b.earned(badgeStats)).length;

  const initial = profile.display_name.slice(0, 1).toUpperCase();
  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-7 px-8 py-10">
      {/* Hero */}
      <Reveal className="flex items-center justify-between gap-6 rounded-2xl bg-sidebar p-10">
        <div className="flex items-center gap-5">
          <Avatar className="h-[72px] w-[72px] ring-2 ring-primary/40 ring-offset-2 ring-offset-sidebar">
            <AvatarFallback className="bg-primary text-2xl font-bold text-primary-foreground">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-heading text-[26px] font-bold text-sidebar-foreground">
              {profile.display_name}
            </p>
            <p className="text-sm text-sidebar-foreground/80">Member since {memberSince}</p>
          </div>
        </div>
        {isSelf && (
          <Button variant="outline" className="border-sidebar-foreground/40 text-sidebar-foreground hover:bg-sidebar-accent">
            Edit Profile
          </Button>
        )}
      </Reveal>

      {/* Achievement level */}
      <LevelProgress points={lifetime.points} />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        <Reveal delay={0}>
          <StatTile
            value={recordsHeldInGroup.length}
            label={`In ${group.name}`}
            labelColor={BRAND_COLORS.gold}
          />
        </Reveal>
        <Reveal delay={60}>
          <StatTile value={lifetime.roundsPlayed} label="Lifetime" />
        </Reveal>
        <Reveal delay={120}>
          <StatTile value={lifetime.marqueeCoursesPlayed} label="Lifetime" sublabel="Top 100 played" />
        </Reveal>
        <Reveal delay={180}>
          <StatTile value={lifetime.statesPlayed} label="Lifetime" sublabel="States played" />
        </Reveal>
      </div>

      {/* Your standing across groups — self-view only */}
      {isSelf && groupStandings.length > 0 && (
        <Reveal delay={240} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-6">
          <p className="font-heading text-lg font-bold">Your Standing Across Groups</p>
          <p className="mb-2 text-xs text-muted-foreground">
            {lifetime.recordsHeld} total records across {groupStandings.length} group
            {groupStandings.length === 1 ? "" : "s"}
          </p>
          <div className="divide-y divide-border">
            {groupStandings.map((g) => (
              <div key={g.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-bold">{g.name}</p>
                  <p className="text-xs text-muted-foreground">{g.memberCount} members</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">Rank #{g.yourRank || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.yourRecords} record{g.yourRecords === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {/* Badge collection */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="font-heading text-[22px] font-bold">Badge Collection</p>
            <p className="text-sm text-muted-foreground">
              {earnedCount} of {BADGE_COLLECTION.length} badges earned
            </p>
          </div>
          <Link href={`/profile/${id}/badges`} className="text-sm font-bold text-primary hover:underline">
            View all 100 tiered badges →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BADGE_COLLECTION.map((badge, i) => {
            const earned = badge.earned(badgeStats);
            const Icon = badge.icon;
            return (
              <Reveal key={badge.id} delay={i * 50}>
                <div
                  className={`flex items-center gap-4 rounded-xl border bg-card p-5 ${
                    earned ? "hover-lift border-border" : "border-border/60 opacity-55"
                  }`}
                >
                  <div
                    className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border-2 ${
                      earned ? "motion-safe:animate-badge-shimmer" : ""
                    }`}
                    style={{
                      backgroundColor: BRAND_COLORS.cream,
                      borderColor: earned ? BRAND_COLORS.gold : BRAND_COLORS.unclaimed,
                      animationDelay: `${300 + i * 50}ms`,
                    }}
                  >
                    <Icon className="h-6 w-6" style={{ color: BRAND_COLORS.ink }} strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{badge.name}</p>
                    <p className="text-xs text-muted-foreground">{badge.description(badgeStats)}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </div>
  );
}
