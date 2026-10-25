import Link from "next/link";
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
import { Reveal } from "@/components/Reveal";

const TOTAL_BADGES = 100;

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

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-10">
      <div className="space-y-1">
        <h1 className="font-heading text-[32px] font-bold">
          Welcome back, {profile?.display_name ?? "there"}
        </h1>
        <p className="text-[15px] text-muted-foreground">{today}</p>
      </div>

      {/* Progress + badge teaser */}
      <Reveal className="flex flex-wrap items-stretch gap-5">
        <div className="min-w-[280px] flex-1">
          <LevelProgress points={yourLifetime?.points ?? 0} compact />
        </div>
        <Link
          href={`/profile/${user.id}/badges`}
          className="hover-lift flex min-w-[220px] flex-1 items-center justify-between rounded-xl border border-border bg-card p-7 hover:border-primary"
        >
          <div>
            <p className="font-heading text-lg font-bold">
              {earnedBadgeCount} of {TOTAL_BADGES} badges
            </p>
            <p className="text-sm text-muted-foreground">View your full collection →</p>
          </div>
        </Link>
      </Reveal>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        <Reveal delay={0}>
          <StatTile
            value={recordsCountByUser.get(user.id) ?? 0}
            label={`In ${group.name}`}
            labelColor={BRAND_COLORS.gold}
          />
        </Reveal>
        <Reveal delay={60}>
          <StatTile value={yourLifetime?.roundsPlayed ?? 0} label="Lifetime" sublabel="Rounds played" />
        </Reveal>
        <Reveal delay={120}>
          <StatTile value={yourLifetime?.marqueeCoursesPlayed ?? 0} label="Lifetime" sublabel="Top 100 played" />
        </Reveal>
        <Reveal delay={180}>
          <StatTile value={yourLifetime?.statesPlayed ?? 0} label="Lifetime" sublabel="States played" />
        </Reveal>
      </div>

      <div className="flex flex-wrap items-start gap-7">
        {/* Main column */}
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
          {/* Recent Activity */}
          <Reveal className="flex flex-col gap-4 rounded-xl border border-border bg-card p-7">
            <p className="font-heading text-[22px] font-bold">Recent Activity</p>
            <div className="flex flex-col gap-4">
              {activity.map((item, i) => (
                <Reveal key={item.id} delay={i * 60} className="flex items-start gap-3">
                  <span
                    className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        item.actorUserId === user.id
                          ? BRAND_COLORS.gold
                          : friends.find((f) => f.id === item.actorUserId)?.color ?? BRAND_COLORS.muted,
                    }}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm">{activityText(item, user.id)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(item.createdAt)}
                    </span>
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
          </Reveal>
        </div>

        {/* Sidebar */}
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-7">
          <Reveal delay={50} className="flex flex-col gap-3.5 rounded-xl bg-sidebar p-7">
            <p className="font-heading text-xl font-bold text-sidebar-foreground">Log a Round</p>
            <p className="text-sm leading-relaxed text-sidebar-foreground/85">
              Post today&apos;s score and defend your territory before someone else claims it.
            </p>
            <Link
              href="/log-round"
              className="hover-lift self-start rounded-lg bg-primary px-[22px] py-3 text-[15px] font-bold text-primary-foreground hover:opacity-90"
            >
              Log a Round
            </Link>
          </Reveal>
        </div>
      </div>

      {/* Your Territory — the full interactive map (filters, hover effects,
          National Leaderboard, All Courses) now lives here instead of on a
          separate /map page, which redirects here. Same component, same
          data, no duplicate page to keep in sync. Replaces the old
          Group Standings sidebar card too — the map's own National
          Leaderboard already covers that (and more: badges + rounds
          played, every member, not just the top 5). */}
      <Reveal delay={100} className="space-y-1">
        <p className="font-heading text-[22px] font-bold">Your Territory</p>
        <p className="text-sm text-muted-foreground">
          {usCourseCount} course{usCourseCount === 1 ? "" : "s"} tracked nationwide — you hold {yourUsCount}
        </p>
      </Reveal>
      <Reveal delay={150}>
        <TerritoryMapClient
          courses={courses}
          records={records}
          friends={friends}
          currentUserId={user.id}
          roundsPlayedByFriend={roundsPlayedByFriend}
          badgeCountByFriend={badgeCountByFriend}
        />
      </Reveal>
    </div>
  );
}
