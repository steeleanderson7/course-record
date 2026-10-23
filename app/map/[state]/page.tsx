import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveGroup } from "@/lib/supabase/guards";
import { getGroupMembers, getGroupRecords } from "@/lib/queries";
import { findState } from "@/lib/geo/us-projection";
import { slugToStateName } from "@/lib/geo/us-states";
import { TerritoryMapClient } from "@/components/map/TerritoryMapClient";

export default async function StateMapPage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state: slug } = await params;
  const stateName = slugToStateName(slug);
  if (!stateName) notFound();

  const { supabase, user, group } = await requireActiveGroup();
  const [friends, { records, courses }] = await Promise.all([
    getGroupMembers(supabase, group.id, user.id),
    getGroupRecords(supabase, group.id),
  ]);

  const stateCourses = courses.filter((c) => findState(c.lon, c.lat)?.name === stateName);
  const stateCourseIds = new Set(stateCourses.map((c) => c.id));
  const yourCount = records.filter(
    (r) => r.holderUserId === user.id && stateCourseIds.has(r.courseId)
  ).length;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-7 px-8 py-10">
      <div className="space-y-1">
        <Link href="/map" className="mb-0.5 flex items-center gap-1 text-[13px] font-semibold text-muted-foreground">
          ← All states
        </Link>
        <h1 className="font-heading text-[32px] font-bold">Territory Map — {stateName}</h1>
        <p className="text-[15px] text-muted-foreground">
          {stateCourses.length} course{stateCourses.length === 1 ? "" : "s"} tracked across {stateName} — you hold{" "}
          {yourCount}
        </p>
      </div>

      <TerritoryMapClient
        courses={courses}
        records={records}
        friends={friends}
        currentUserId={user.id}
        focusState={stateName}
      />
    </div>
  );
}
