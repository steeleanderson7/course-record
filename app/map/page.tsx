import { requireActiveGroup } from "@/lib/supabase/guards";
import { getGroupMembers, getGroupRecords } from "@/lib/queries";
import { findState } from "@/lib/geo/us-projection";
import { TerritoryMapClient } from "@/components/map/TerritoryMapClient";

export default async function MapPage() {
  const { supabase, user, group } = await requireActiveGroup();
  const [friends, { records, courses }] = await Promise.all([
    getGroupMembers(supabase, group.id, user.id),
    getGroupRecords(supabase, group.id),
  ]);

  const courseById = new Map(courses.map((c) => [c.id, c]));
  const isUsCourse = (courseId: string) => {
    const c = courseById.get(courseId);
    return c ? findState(c.lon, c.lat) !== null : false;
  };

  const usCourseCount = courses.filter((c) => findState(c.lon, c.lat)).length;
  const yourCount = records.filter((r) => r.holderUserId === user.id && isUsCourse(r.courseId)).length;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-7 px-8 py-10">
      <div className="space-y-1">
        <h1 className="font-heading text-[32px] font-bold">Territory Map</h1>
        <p className="text-[15px] text-muted-foreground">
          {usCourseCount} course{usCourseCount === 1 ? "" : "s"} tracked nationwide — you hold{" "}
          {yourCount}
        </p>
      </div>

      <TerritoryMapClient courses={courses} records={records} friends={friends} currentUserId={user.id} />
    </div>
  );
}
