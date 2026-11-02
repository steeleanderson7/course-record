import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy, Star, Crown } from "lucide-react";
import { requireActiveGroup } from "@/lib/supabase/guards";
import {
  getCourseDetail,
  getCourseGlobalRanking,
  getCourseActivityLog,
  getGroupMembers,
  fetchLifetimeStats,
  type CourseActivityItem,
} from "@/lib/queries";
import { relativeToPar } from "@/lib/activityText";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { InitialAvatar } from "@/components/InitialAvatar";
import { BRAND_COLORS } from "@/lib/colors";
import { findState } from "@/lib/geo/us-projection";
import { stateNameToSlug } from "@/lib/geo/us-states";
import { levelForPoints } from "@/lib/levels";
import { BADGE_COLLECTION, type BadgeStats } from "@/lib/badges";
import { daysSince, formatRelativeTime } from "@/lib/relativeTime";

const TOP_N = 5;
const MAX_CHAMPION_BADGES = 4;

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, group } = await requireActiveGroup();

  const friends = await getGroupMembers(supabase, group.id, user.id);
  const [{ course, record }, globalRanking, activity] = await Promise.all([
    getCourseDetail(supabase, id, group.id),
    getCourseGlobalRanking(supabase, id),
    getCourseActivityLog(supabase, group.id, id, friends),
  ]);
  if (!course) notFound();

  const holder = record ? friends.find((f) => f.id === record.holder_user_id) : undefined;
  const isHolderSelf = holder?.id === user.id;

  // Lifetime stats + badges for whoever currently holds the record — NOT
  // the logged-in viewer. The extra self-only badge inputs (best score to
  // par, flagship-course checks) only come back populated when the holder
  // happens to be the viewer themselves, same privacy rule getFullProfile
  // uses for every other profile view in this app.
  const holderLifetime = holder ? await fetchLifetimeStats(supabase, holder.id) : null;
  const holderBadgeStats: BadgeStats | null = holderLifetime
    ? {
        recordsHeld: holderLifetime.recordsHeld,
        roundsPlayed: holderLifetime.roundsPlayed,
        marqueeCoursesPlayed: holderLifetime.marqueeCoursesPlayed,
        statesPlayed: holderLifetime.statesPlayed,
        points: holderLifetime.points,
        bestScoreToPar: null,
        playedFlagshipCourse: false,
        playedAllMajorVenues: false,
      }
    : null;
  const championBadges = holderBadgeStats
    ? BADGE_COLLECTION.filter((b) => b.earned(holderBadgeStats)).slice(0, MAX_CHAMPION_BADGES)
    : [];
  const championLevel = holderLifetime ? levelForPoints(holderLifetime.points) : null;

  const state = findState(course.lon, course.lat);
  const backHref = state ? `/map/${stateNameToSlug(state.name)}` : "/map";
  const backLabel = state ? `← Back to ${state.name} map` : "← Back to map";

  const topGlobal = globalRanking.slice(0, TOP_N);
  const yourGlobalRow = globalRanking.find((r) => r.userId === user.id);
  const yourRowInTop = topGlobal.some((r) => r.userId === user.id);

  // Each card is a closure (not a top-level component) so it can read every
  // already-computed local variable directly — this page has no separate
  // query to pass as props, so threading everything through a prop list
  // would just add ceremony. Every card is called exactly twice below (once
  // per tree in the dual-tree pattern), each call getting its own `delay`
  // appropriate to where it lands in that tree's stagger order — the two
  // trees genuinely both exist in the DOM at once (CSS toggles which one is
  // visible), so this must produce two independent elements, not one shared
  // JSX reference.
  const currentRecordCard = (delay: number) => (
    <Reveal delay={delay} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 md:p-7">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Current Record</p>
      {record && holder ? (
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <InitialAvatar
              name={holder.name}
              color={holder.color}
              isSelf={isHolderSelf}
              className="h-14 w-14"
              textClassName="text-xl"
            />
            <div className="flex flex-col gap-0.5">
              <span className="font-heading text-xl font-bold">Held by {isHolderSelf ? "you" : holder.name}</span>
              <span className="text-sm text-muted-foreground">
                Set {record.date_played} · held for {daysSince(record.date_played)} days
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-heading text-[38px] font-bold leading-none text-primary">{record.score}</span>
            {course.par != null && (
              <span className="text-[13px] text-muted-foreground">({relativeToPar(record.score, course.par)})</span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No record set here yet — be the first.</p>
      )}
    </Reveal>
  );

  const logRoundCta = (delay: number) => (
    <Reveal delay={delay} className="flex flex-col gap-3.5 rounded-xl bg-sidebar p-5 md:p-7">
      <p className="font-heading text-xl font-bold text-sidebar-foreground">
        {record ? `Think you can beat ${record.score}?` : "Be the first to set a record"}
      </p>
      <p className="text-sm text-sidebar-foreground/80">
        {record && holder
          ? `Log a round at ${course.name} and take the record from ${isHolderSelf ? "yourself" : holder.name}.`
          : `Log a round at ${course.name} and claim the first record.`}
      </p>
      <Button asChild className="min-h-11 w-full sm:w-auto sm:self-start">
        <Link href={`/log-round/score?courseId=${course.id}`}>Log a Round Here</Link>
      </Button>
    </Reveal>
  );

  const activityLogCard = (delay: number) => (
    <Reveal delay={delay} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 md:p-7">
      <p className="font-heading text-lg font-bold">Activity Log</p>
      <div className="flex flex-col">
        {activity.map((item, i) => (
          <ActivityRow
            key={item.id}
            item={item}
            par={course.par}
            viewerUserId={user.id}
            isLast={i === activity.length - 1}
          />
        ))}
        {activity.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">No rounds logged here yet.</p>
        )}
      </div>
    </Reveal>
  );

  const courseChampionCard = (delay: number) =>
    holder && championLevel ? (
      <Reveal delay={delay} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 md:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Course Champion</p>
        <Link href={`/profile/${holder.id}`} className="flex items-center gap-3.5 hover:opacity-90">
          <InitialAvatar
            name={holder.name}
            color={holder.color}
            isSelf={isHolderSelf}
            className="h-12 w-12"
            textClassName="text-[17px]"
          />
          <div className="flex flex-col gap-0.5">
            <span className="font-heading text-[17px] font-bold">{isHolderSelf ? "You" : holder.name}</span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
              <Crown className="h-2.5 w-2.5" fill="currentColor" strokeWidth={0} />
              {championLevel.current.name}
            </span>
          </div>
        </Link>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[13px] text-muted-foreground">
            <span>{holderLifetime?.points.toLocaleString()} pts</span>
            {championLevel.next && <span>{championLevel.pointsToNext.toLocaleString()} to {championLevel.next.name}</span>}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.round(championLevel.progress * 100)}%` }}
            />
          </div>
        </div>
        {championBadges.length > 0 && (
          <>
            <div className="h-px bg-border" />
            <div className="flex gap-3">
              {championBadges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <div key={badge.id} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2"
                      style={{ backgroundColor: BRAND_COLORS.cream, borderColor: BRAND_COLORS.gold }}
                    >
                      <Icon className="h-[18px] w-[18px]" style={{ color: BRAND_COLORS.ink }} strokeWidth={1.6} />
                    </div>
                    <span className="text-center text-[10px] leading-tight text-muted-foreground">{badge.name}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <Link href={`/profile/${holder.id}`} className="self-start text-[13px] font-bold hover:text-primary">
          View full profile →
        </Link>
      </Reveal>
    ) : null;

  const globalRankingCard = (delay: number) => (
    <Reveal delay={delay} className="flex flex-col gap-1 rounded-xl bg-sidebar p-5 md:p-6">
      <div className="flex items-center gap-2.5">
        <Trophy className="h-5 w-5 text-primary" strokeWidth={1.75} />
        <p className="font-heading text-lg font-bold text-sidebar-foreground">Global Ranking</p>
      </div>
      <p className="mb-2 text-xs text-sidebar-foreground/60">Ranked across every CourseRecord.golf player</p>

      {globalRanking.length === 0 ? (
        <p className="py-2 text-sm text-sidebar-foreground/70">No one&apos;s logged a round here yet — be the first.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {topGlobal.map((r) => {
            const isYou = r.userId === user.id;
            return (
              <div
                key={r.userId}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 ${
                  isYou ? "bg-primary/15" : ""
                }`}
              >
                <span className="flex items-center gap-3 text-sm">
                  <span
                    className="font-heading w-5 font-bold"
                    style={{ color: r.rank === 1 ? BRAND_COLORS.gold : "rgba(246,241,228,0.6)" }}
                  >
                    {r.rank}
                  </span>
                  <span className={isYou ? "font-bold text-sidebar-foreground" : "text-sidebar-foreground/90"}>
                    {r.displayName}
                    {isYou ? " (you)" : ""}
                  </span>
                </span>
                <span className="text-sm font-bold text-sidebar-foreground">{r.score}</span>
              </div>
            );
          })}
          {yourGlobalRow && !yourRowInTop && (
            <>
              <div className="my-1 h-px bg-sidebar-foreground/10" />
              <div className="flex items-center justify-between rounded-lg bg-primary/15 px-2.5 py-1.5">
                <span className="flex items-center gap-3 text-sm">
                  <span className="font-heading w-5 font-bold text-sidebar-foreground/60">
                    {yourGlobalRow.rank}
                  </span>
                  <span className="font-bold text-sidebar-foreground">You</span>
                </span>
                <span className="text-sm font-bold text-sidebar-foreground">{yourGlobalRow.score}</span>
              </div>
            </>
          )}
        </div>
      )}
    </Reveal>
  );

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-5 px-4 py-5 md:space-y-7 md:px-8 md:py-10">
      <Reveal className="space-y-1">
        <Link href={backHref} className="mb-0.5 block text-[13px] font-semibold text-muted-foreground hover:text-primary">
          {backLabel}
        </Link>
        <h1 className="font-heading text-2xl font-bold md:text-[32px]">{course.name}</h1>
        <p className="text-sm text-muted-foreground md:text-[15px]">
          {course.par != null ? `Par ${course.par} · ` : ""}
          {[course.city, course.country_code].filter(Boolean).join(", ") || "Location unknown"}
        </p>
      </Reveal>

      {/* Mobile: single column, reordered so the primary action (Log a
          Round Here) is reachable right after seeing the current record,
          not buried below a potentially-long Activity Log — matches the
          "fast, one-handed" philosophy used throughout the mobile work,
          short of a sticky-bottom button (overkill here: this is a single
          optional action on a browsing page, not a multi-step form's
          terminal commit). */}
      <div className="flex flex-col gap-5 md:hidden">
        {currentRecordCard(60)}
        {logRoundCta(100)}
        {activityLogCard(140)}
        {courseChampionCard(180)}
        {globalRankingCard(220)}
      </div>

      {/* Desktop: unchanged two-column layout. */}
      <div className="hidden flex-wrap items-start gap-7 md:flex">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
          {currentRecordCard(60)}
          {activityLogCard(120)}
        </div>
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-7">
          {logRoundCta(60)}
          {courseChampionCard(120)}
          {globalRankingCard(180)}
        </div>
      </div>
    </div>
  );
}

function ActivityRow({
  item,
  par,
  viewerUserId,
  isLast,
}: {
  item: CourseActivityItem;
  par: number | null;
  viewerUserId: string;
  isLast: boolean;
}) {
  const isYou = item.actorUserId === viewerUserId;
  const actor = isYou ? "You" : item.actorName;
  const label = item.isRecordSetting
    ? `${actor} set a new course record — ${item.score}${par != null ? ` (${relativeToPar(item.score, par)})` : ""}`
    : `${actor} played a round — shot ${item.score}`;
  const dateLine =
    formatRelativeTime(item.datePlayed) +
    (item.heldForDays != null ? ` · held for ${item.heldForDays} day${item.heldForDays === 1 ? "" : "s"}` : "");
  const accentColor = item.isCurrentRecord ? BRAND_COLORS.gold : item.actorColor;

  return (
    <div
      className={`activity-row flex items-start gap-3.5 rounded-lg px-2.5 py-3 ${isLast ? "" : "border-b border-border/60"}`}
    >
      {item.isRecordSetting ? (
        <div
          className="mt-0.5 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2"
          style={{ backgroundColor: BRAND_COLORS.cream, borderColor: accentColor }}
        >
          <Star className="h-3.5 w-3.5" style={{ color: accentColor }} fill="currentColor" strokeWidth={0} />
        </div>
      ) : (
        <div
          className="mt-0.5 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
          style={{ backgroundColor: item.actorColor, color: isYou ? BRAND_COLORS.ink : "#FFFFFF" }}
        >
          {item.actorName.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-0.5">
        <span className={`text-sm ${item.isRecordSetting ? "font-semibold" : ""}`}>{label}</span>
        <span className="text-xs text-muted-foreground">{dateLine}</span>
      </div>
    </div>
  );
}
