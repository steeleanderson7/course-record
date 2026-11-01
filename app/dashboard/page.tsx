import Link from "next/link";
import { Plus } from "lucide-react";
import { requireActiveGroup } from "@/lib/supabase/guards";
import {
  getGroupActivityFeed,
  getGroupLifetimeStats,
  getGroupMembers,
  getGroupRecords,
} from "@/lib/queries";
import { activityText } from "@/lib/activityText";
import { formatRelativeTime, formatTodayLong } from "@/lib/relativeTime";
import { BRAND_COLORS } from "@/lib/colors";
import { countEarnedBadges } from "@/lib/badgeCatalog";
import { getPlayerMetricsMap, getGroupBadgeCounts } from "@/lib/badgeMetrics";
import { findState } from "@/lib/geo/us-projection";
import { LevelProgress } from "@/components/LevelProgress";
import { StatTile } from "@/components/StatTile";
import { TerritoryMapClient } from "@/components/map/TerritoryMapClient";
import { MiniTerritoryPreview } from "@/components/map/MiniTerritoryPreview";
import { Reveal } from "@/components/Reveal";

const TOTAL_BADGES = 100;

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const { supabase, user, group } = await requireActiveGroup();

  const [{ data: profile }, friends, { records, courses }, activity, metrics] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    getGroupMembers(supabase, group.id, user.id),
    getGroupRecords(supabase, group.id),
    getGroupActivityFeed(supabase, group.id, user.id, 5),
    getPlayerMetricsMap(supabase, user.id),
  ]);

  const memberIds = friends.map((f) => f.id);
  // Same data the standalone /map page used to fetch on its own — the
  // territory map now lives here instead, so the Dashboard needs the one
  // query /map needed that it didn't already have (badge counts for the
  // National Leaderboard card; everything else it already fetches above
  // for the stat tiles/activity feed).
  const [lifetimeByMember, badgeCountByFriend] = await Promise.all([
    getGroupLifetimeStats(supabase, memberIds),
    getGroupBadgeCounts(supabase, memberIds),
  ]);
  const roundsPlayedByFriend = Object.fromEntries(
    memberIds.map((id) => [id, lifetimeByMember.get(id)?.roundsPlayed ?? 0])
  );
  const yourLifetime = lifetimeByMember.get(user.id);

  const recordsCountByUser = new Map<string, number>();
  for (const r of records) recordsCountByUser.set(r.holderUserId, (recordsCountByUser.get(r.holderUserId) ?? 0) + 1);

  const courseById = new Map(courses.map((c) => [c.id, c]));
  const isUsCourse = (courseId: string) => {
    const c = courseById.get(courseId);
    return c ? findState(c.lon, c.lat) !== null : false;
  };
  const usCourseCount = courses.filter((c) => findState(c.lon, c.lat)).length;
  const yourUsCount = records.filter((r) => r.holderUserId === user.id && isUsCourse(r.courseId)).length;

  // Dashboard teaser now reflects the 100-badge tiered system (the main
  // gamification driver going forward), not the older 8-badge collection —
  // that one still lives further down the Profile page, but shouldn't be
  // the number someone sees first after logging in anymore.
  const earnedBadgeCount = countEarnedBadges(metrics);

  const today = formatTodayLong();
  const yourRecordsCount = recordsCountByUser.get(user.id) ?? 0;
  const firstName = (profile?.display_name ?? "there").split(" ")[0];

  const activityFeed = (avatarSize: "sm" | "md") => (
    <div className="flex flex-col gap-4">
      {activity.map((item, i) => (
        <Reveal key={item.id} delay={i * 60} className="flex items-start gap-3">
          <span
            className={`shrink-0 rounded-full ${avatarSize === "sm" ? "mt-1 h-2 w-2" : "mt-1.5 h-2.5 w-2.5"}`}
            style={{
              backgroundColor:
                item.actorUserId === user.id
                  ? BRAND_COLORS.gold
                  : friends.find((f) => f.id === item.actorUserId)?.color ?? BRAND_COLORS.muted,
            }}
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm">{activityText(item, user.id)}</span>
            <span className="text-xs text-muted-foreground">{formatRelativeTime(item.createdAt)}</span>
          </div>
        </Reveal>
      ))}
      {activity.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No rounds logged yet —{" "}
          <Link href="/log-round" className="font-semibold text-primary hover:underline">
            log your first one
          </Link>
          .
        </p>
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-5 px-4 py-5 md:space-y-7 md:px-8 md:py-10">
      {/* Mobile tree — compact CTA-first layout matching the mobile
          dashboard mockup: greeting, a prominent Log a Round card (Log a
          Round is also a persistent nav button, but the mockup keeps this
          card too — more motivating context than a bare nav icon gives),
          2-column stat tiles, a glanceable territory preview linking to
          the full map, and recent activity. */}
      <div className="flex flex-col gap-5 md:hidden">
        <div className="space-y-0.5">
          <h1 className="font-heading text-[22px] font-bold">
            {timeOfDayGreeting()}, {firstName}
          </h1>
          <p className="text-[13px] text-muted-foreground">{today}</p>
        </div>

        <Link
          href="/log-round"
          className="hover-lift flex items-center justify-between rounded-[14px] p-4"
          style={{ backgroundColor: BRAND_COLORS.fairway, boxShadow: "0 6px 16px rgba(27,67,50,0.25)" }}
        >
          <div className="min-w-0">
            <p className="text-[15px] font-bold" style={{ color: BRAND_COLORS.cream }}>
              Log a Round
            </p>
            <p className="text-[11.5px]" style={{ color: "rgba(246,241,228,0.7)" }}>
              Post today&apos;s score and defend your territory
            </p>
          </div>
          <span
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
            style={{ backgroundColor: BRAND_COLORS.gold }}
          >
            <Plus className="h-5 w-5" style={{ color: BRAND_COLORS.ink }} strokeWidth={2.5} />
          </span>
        </Link>

        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href={`/profile/${user.id}/badges`}
            className="min-h-[44px] rounded-xl border border-border bg-card p-3.5"
          >
            <p className="font-heading text-2xl font-bold">
              {earnedBadgeCount}
              <span className="text-sm text-muted-foreground">/{TOTAL_BADGES}</span>
            </p>
            <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Badges</p>
          </Link>
          <div className="min-h-[44px] rounded-xl border border-border bg-card p-3.5">
            <p className="font-heading text-2xl font-bold">{yourRecordsCount}</p>
            <p className="mt-0.5 text-xs font-bold uppercase tracking-wide" style={{ color: BRAND_COLORS.gold }}>
              In {group.name}
            </p>
          </div>
          <div className="min-h-[44px] rounded-xl border border-border bg-card p-3.5">
            <p className="font-heading text-2xl font-bold">{yourLifetime?.roundsPlayed ?? 0}</p>
            <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Rounds played</p>
          </div>
          <div className="min-h-[44px] rounded-xl border border-border bg-card p-3.5">
            <p className="font-heading text-2xl font-bold">{yourLifetime?.statesPlayed ?? 0}</p>
            <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">States played</p>
          </div>
        </div>

        <Link href="/map" className="flex items-center gap-3.5 rounded-[14px] border border-border bg-card p-3.5">
          <MiniTerritoryPreview courses={courses} records={records} friends={friends} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Your Territory</p>
            <p className="text-xs text-muted-foreground">
              You control {yourRecordsCount} of {records.length} tracked course{records.length === 1 ? "" : "s"}
            </p>
            <p className="mt-0.5 text-xs font-bold" style={{ color: BRAND_COLORS.gold }}>
              View full map →
            </p>
          </div>
        </Link>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <p className="font-heading text-[17px] font-bold">Recent Activity</p>
          {activityFeed("sm")}
        </div>
      </div>

      {/* Desktop tree — unchanged from before this task. */}
      <div className="hidden md:flex md:flex-col md:gap-7">
        <div className="space-y-1">
          <h1 className="font-heading text-[32px] font-bold">Welcome back, {profile?.display_name ?? "there"}</h1>
          <p className="text-[15px] text-muted-foreground">{today}</p>
        </div>

        {/* One tight summary row instead of two stacked ones (a wide,
            sparse "progress + badges" row followed by a separate stat-tile
            grid) — level progress and every stat tile now share a single
            band, so the map starts right after it instead of two sections
            down. Log a Round lived in a sidebar card here before; it's a
            persistent nav button now, so that whole row is gone. */}
        <Reveal className="flex flex-wrap items-stretch gap-5">
          <div className="min-w-[280px] flex-1">
            <LevelProgress points={yourLifetime?.points ?? 0} compact />
          </div>
          {/* A grid, not another flex-wrap row — five items sharing a flex
              row with uneven flex-basis values (LevelProgress above is its
              own sibling, not part of this group) wrapped unevenly, leaving
              a single tile orphaned on its own line. A grid wraps in whole
              rows instead, so it's always a clean 5, 3, or 2 across. */}
          <div className="grid min-w-[300px] flex-[2] grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            <Link
              href={`/profile/${user.id}/badges`}
              className="hover-lift flex flex-col justify-center rounded-xl border border-border bg-card p-6 hover:border-primary"
            >
              <p className="font-heading text-3xl font-bold">
                {earnedBadgeCount}
                <span className="text-lg text-muted-foreground">/{TOTAL_BADGES}</span>
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Badges</p>
            </Link>
            <StatTile value={yourRecordsCount} label={`In ${group.name}`} labelColor={BRAND_COLORS.gold} />
            <StatTile value={yourLifetime?.roundsPlayed ?? 0} label="Lifetime" sublabel="Rounds played" />
            <StatTile value={yourLifetime?.marqueeCoursesPlayed ?? 0} label="Lifetime" sublabel="Top 100 played" />
            <StatTile value={yourLifetime?.statesPlayed ?? 0} label="Lifetime" sublabel="States played" />
          </div>
        </Reveal>

        {/* Your Territory — the full interactive map (filters, hover
            effects, National Leaderboard, All Courses) now lives here
            instead of on a separate /map page, which redirects here. Same
            component, same data, no duplicate page to keep in sync. Moved
            up to be the dashboard's centerpiece, right after the summary
            row. */}
        <Reveal delay={80} className="space-y-1">
          <p className="font-heading text-[22px] font-bold">Your Territory</p>
          <p className="text-sm text-muted-foreground">
            {usCourseCount} course{usCourseCount === 1 ? "" : "s"} tracked nationwide — you hold {yourUsCount}
          </p>
        </Reveal>
        <Reveal delay={130}>
          <TerritoryMapClient
            courses={courses}
            records={records}
            friends={friends}
            currentUserId={user.id}
            roundsPlayedByFriend={roundsPlayedByFriend}
            badgeCountByFriend={badgeCountByFriend}
          />
        </Reveal>

        {/* Recent Activity — a supporting section below the map rather
            than competing with it for top-of-page space. */}
        <Reveal delay={60} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-7">
          <p className="font-heading text-[22px] font-bold">Recent Activity</p>
          {activityFeed("md")}
        </Reveal>
      </div>
    </div>
  );
}
