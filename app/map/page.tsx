import { requireActiveGroup } from "@/lib/supabase/guards";
import { getGroupMembers, getGroupRecords, getGroupLifetimeStats } from "@/lib/queries";
import { getGroupBadgeCounts } from "@/lib/badgeMetrics";
import { findState } from "@/lib/geo/us-projection";
import { TerritoryMapClient } from "@/components/map/TerritoryMapClient";

// Restored as a real page (was briefly a redirect to /dashboard, when the
// only way to reach the national map was the desktop nav and having both
// felt redundant). The new mobile tab bar's dedicated "Map" destination
// needs somewhere real to point — same TerritoryMapClient/data Dashboard's
// "Your Territory" section already uses, so there's still no duplicated
// data-fetching logic, just a second place that renders it: a full-page
// "Map" experience here, a glanceable preview embedded on the Dashboard.
export default async function MapPage() {
  const { supabase, user, group } = await requireActiveGroup();
  const [friends, { records, courses }] = await Promise.all([
    getGroupMembers(supabase, group.id, user.id),
    getGroupRecords(supabase, group.id),
  ]);

  const memberIds = friends.map((f) => f.id);
  const [lifetimeByMember, badgeCountByFriend] = await Promise.all([
    getGroupLifetimeStats(supabase, memberIds),
    getGroupBadgeCounts(supabase, memberIds),
  ]);
  const roundsPlayedByFriend = Object.fromEntries(
    memberIds.map((id) => [id, lifetimeByMember.get(id)?.roundsPlayed ?? 0])
  );

  const courseById = new Map(courses.map((c) => [c.id, c]));
  const isUsCourse = (courseId: string) => {
    const c = courseById.get(courseId);
    return c ? findState(c.lon, c.lat) !== null : false;
  };

  const usCourseCount = courses.filter((c) => findState(c.lon, c.lat)).length;
  const yourCount = records.filter((r) => r.holderUserId === user.id && isUsCourse(r.courseId)).length;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-7 px-4 py-6 md:px-8 md:py-10">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-bold md:text-[32px]">Territory Map</h1>
        <p className="text-[13px] text-muted-foreground md:text-[15px]">
          {usCourseCount} course{usCourseCount === 1 ? "" : "s"} tracked nationwide — you hold{" "}
          {yourCount}
        </p>
      </div>

      <TerritoryMapClient
        courses={courses}
        records={records}
        friends={friends}
        currentUserId={user.id}
        roundsPlayedByFriend={roundsPlayedByFriend}
        badgeCountByFriend={badgeCountByFriend}
      />
    </div>
  );
}
