import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveGroup } from "@/lib/supabase/guards";
import { getGroupMembers, getGroupRecords } from "@/lib/queries";
import { findState } from "@/lib/geo/us-projection";
import { slugToStateName } from "@/lib/geo/us-states";
import { TerritoryMapClient } from "@/components/map/TerritoryMapClient";
import { BRAND_COLORS } from "@/lib/colors";

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
  const you = friends.find((f) => f.id === user.id);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-5 px-4 py-4 md:space-y-7 md:px-8 md:py-10">
      {/* Mobile header — back arrow + centered title stack + avatar, matching
          the mobile map mockup; "← All states" goes to /map, the restored
          national-map page (not /dashboard — that's a glanceable preview,
          /map is the real "every state" hub this link's label describes). */}
      <div className="flex items-center justify-between gap-3 md:hidden">
        <Link
          href="/map"
          aria-label="All states"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-border"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M11,3 L5,9 L11,15" stroke={BRAND_COLORS.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="font-heading truncate text-[17px] font-bold">{stateName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {stateCourses.length} course{stateCourses.length === 1 ? "" : "s"} · you hold {yourCount}
          </p>
        </div>
        <div
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: you?.color ?? BRAND_COLORS.gold }}
        >
          {(you?.name ?? "?").slice(0, 1).toUpperCase()}
        </div>
      </div>

      {/* Desktop header — unchanged. */}
      <div className="hidden space-y-1 md:block">
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
