import { Mountain, Target, TrendingUp, ShieldCheck, Globe2, Star } from "lucide-react";
import { requireActiveGroup } from "@/lib/supabase/guards";
import {
  getGroupBestRounds,
  getGroupLifetimeStats,
  getGroupMembers,
  getGroupRecords,
} from "@/lib/queries";
import { findState } from "@/lib/geo/us-projection";
import { daysSince } from "@/lib/relativeTime";
import { Reveal } from "@/components/Reveal";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { BRAND_COLORS } from "@/lib/colors";

export default async function LeaderboardPage() {
  const { supabase, user, group } = await requireActiveGroup();
  const [friends, { records, courses }] = await Promise.all([
    getGroupMembers(supabase, group.id, user.id),
    getGroupRecords(supabase, group.id),
  ]);
  const [lifetimeByMember, bestRounds] = await Promise.all([
    getGroupLifetimeStats(supabase, friends.map((f) => f.id)),
    getGroupBestRounds(supabase, group.id),
  ]);

  const courseById = new Map(courses.map((c) => [c.id, c]));
  const recordsByHolder = new Map<string, typeof records>();
  for (const r of records) {
    const list = recordsByHolder.get(r.holderUserId) ?? [];
    list.push(r);
    recordsByHolder.set(r.holderUserId, list);
  }

  const rows = friends
    .map((friend) => {
      const held = recordsByHolder.get(friend.id) ?? [];
      const states = new Set(
        held
          .map((r) => {
            const course = courseById.get(r.courseId);
            return course ? findState(course.lon, course.lat)?.name : null;
          })
          .filter(Boolean)
      );
      return {
        friend,
        records: held.length,
        played: lifetimeByMember.get(friend.id)?.roundsPlayed ?? 0,
        top100: lifetimeByMember.get(friend.id)?.marqueeCoursesPlayed ?? 0,
        states: states.size,
      };
    })
    .sort((a, b) => b.records - a.records);

  const totalRecords = records.length;

  // Achievement cards — each picks whoever leads that specific metric.
  const mostActiveRecords = rows.reduce((a, b) => (b.records > a.records ? b : a), rows[0]);
  const mostCoursesPlayed = rows.reduce((a, b) => (b.played > a.played ? b : a), rows[0]);
  const top100Hunter = rows.reduce((a, b) => (b.top100 > a.top100 ? b : a), rows[0]);
  const territoryControl = rows.reduce((a, b) => (b.states > a.states ? b : a), rows[0]);

  const bestRoundEntries = [...bestRounds.values()].sort((a, b) => a.score - b.score);
  const bestRoundEver = bestRoundEntries[0];
  const bestRoundFriend = bestRoundEver ? friends.find((f) => f.id === bestRoundEver.userId) : null;

  const longestDefense = records
    .map((r) => ({
      record: r,
      days: daysSince(r.datePlayed),
      course: courseById.get(r.courseId),
    }))
    .sort((a, b) => b.days - a.days)[0];
  const longestDefenseFriend = longestDefense
    ? friends.find((f) => f.id === longestDefense.record.holderUserId)
    : null;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-8 py-10">
      <Reveal className="space-y-1">
        <h1 className="font-heading text-[32px] font-bold">Friend Leaderboard</h1>
        <p className="text-[15px] text-muted-foreground">
          {totalRecords} course record{totalRecords === 1 ? "" : "s"} claimed across {group.name}
        </p>
      </Reveal>

      <Reveal delay={60} className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 bg-muted px-6 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <span className="w-6">#</span>
          <span className="flex-1">Player</span>
          <span className="w-20 text-right">Records</span>
          <span className="w-20 text-right">Played</span>
          <span className="w-20 text-right">Top 100</span>
          <span className="w-20 text-right">States</span>
        </div>
        {rows.map(({ friend, records: recordCount, played, top100, states }, i) => {
          const isYou = friend.id === user.id;
          return (
            <div
              key={friend.id}
              className={`flex items-center gap-3 border-t border-border px-6 py-4 transition-colors ${
                isYou ? "bg-primary/[0.08]" : "hover:bg-muted/40"
              }`}
            >
              <span
                className="font-heading w-6 text-xl font-bold"
                style={{ color: i === 0 ? BRAND_COLORS.gold : BRAND_COLORS.muted }}
              >
                {i + 1}
              </span>
              <span className="flex flex-1 items-center gap-2.5">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: friend.color, color: isYou ? BRAND_COLORS.ink : "#fff" }}
                >
                  {friend.name.slice(0, 1).toUpperCase()}
                </span>
                <span className={`text-sm ${isYou ? "font-bold" : "font-semibold"}`}>
                  {friend.name}
                  {isYou ? " (you)" : ""}
                </span>
              </span>
              <span className="w-20 text-right text-sm font-bold">{recordCount}</span>
              <span className="w-20 text-right text-sm text-muted-foreground">{played}</span>
              <span className="w-20 text-right text-sm text-muted-foreground">{top100}</span>
              <span className="w-20 text-right text-sm text-muted-foreground">{states}</span>
            </div>
          );
        })}
      </Reveal>

      {(mostActiveRecords.records > 0 || bestRoundEver) && (
        <div className="space-y-4">
          <Reveal delay={120}>
            <p className="font-heading text-[22px] font-bold">Achievements</p>
          </Reveal>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Reveal delay={150}>
              <AchievementCard
                icon={Mountain}
                label="Most Active Records"
                friend={mostActiveRecords?.records > 0 ? mostActiveRecords.friend : null}
                stat={<><AnimatedNumber value={mostActiveRecords?.records ?? 0} /> records held right now</>}
              />
            </Reveal>
            <Reveal delay={200}>
              <AchievementCard
                icon={Target}
                label="Best Round Ever"
                friend={bestRoundFriend ?? null}
                stat={
                  bestRoundEver ? (
                    <>
                      {bestRoundEver.score}
                      {bestRoundEver.par != null
                        ? ` (${bestRoundEver.score - bestRoundEver.par >= 0 ? "+" : ""}${bestRoundEver.score - bestRoundEver.par})`
                        : ""}{" "}
                      at {bestRoundEver.courseName}
                    </>
                  ) : null
                }
              />
            </Reveal>
            <Reveal delay={250}>
              <AchievementCard
                icon={TrendingUp}
                label="Most Courses Played"
                friend={mostCoursesPlayed?.played > 0 ? mostCoursesPlayed.friend : null}
                stat={<><AnimatedNumber value={mostCoursesPlayed?.played ?? 0} /> rounds logged lifetime</>}
              />
            </Reveal>
            <Reveal delay={300}>
              <AchievementCard
                icon={ShieldCheck}
                label="Longest Defense"
                friend={longestDefenseFriend ?? null}
                stat={
                  longestDefense ? (
                    <>
                      <AnimatedNumber value={longestDefense.days} /> days at {longestDefense.course?.name}
                    </>
                  ) : null
                }
              />
            </Reveal>
            <Reveal delay={350}>
              <AchievementCard
                icon={Globe2}
                label="Territory Control"
                friend={territoryControl?.states > 0 ? territoryControl.friend : null}
                stat={<>Holds a record in <AnimatedNumber value={territoryControl?.states ?? 0} /> states</>}
              />
            </Reveal>
            <Reveal delay={400}>
              <AchievementCard
                icon={Star}
                label="Top 100 Hunter"
                friend={top100Hunter?.top100 > 0 ? top100Hunter.friend : null}
                stat={<><AnimatedNumber value={top100Hunter?.top100 ?? 0} /> marquee courses played</>}
              />
            </Reveal>
          </div>
        </div>
      )}
    </div>
  );
}

function AchievementCard({
  icon: Icon,
  label,
  friend,
  stat,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  label: string;
  friend: { id: string; name: string; color: string } | null;
  stat: React.ReactNode;
}) {
  return (
    <div className="hover-lift flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full border-2"
        style={{ backgroundColor: BRAND_COLORS.cream, borderColor: BRAND_COLORS.gold }}
      >
        <Icon className="h-5 w-5" style={{ color: BRAND_COLORS.ink }} strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-sm font-bold">{label}</p>
        {friend ? (
          <>
            <p className="mt-1 flex items-center gap-1.5 text-sm">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: friend.color }} />
              {friend.name}
            </p>
            <p className="text-xs text-muted-foreground">{stat}</p>
          </>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">Not claimed yet</p>
        )}
      </div>
    </div>
  );
}
