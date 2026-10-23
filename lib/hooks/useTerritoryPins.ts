import { useMemo } from "react";
import { findState, projectPoint, stateCentroid } from "@/lib/geo/us-projection";
import type { Course, CourseRecord, Friend } from "@/lib/types";

export type CoursePin = {
  course: Course;
  record: CourseRecord | null;
  holder: Friend | null;
  state: { name: string; abbr: string };
  xy: [number, number];
};

export type StateBadge = { stateName: string; count: number; xy: [number, number] };

const DEFAULT_AGGREGATE_THRESHOLD = 8;

/**
 * Shared geo/aggregation logic for the territory map — used by both the
 * full interactive /map page and the compact dashboard preview, so the
 * "which courses are even in the US" / "which states collapse into a
 * badge" logic only lives in one place.
 */
export function useTerritoryPins(
  courses: Course[],
  records: CourseRecord[],
  friends: Friend[],
  options?: { focusState?: string; activeFriendId?: string | "all"; aggregateThreshold?: number }
) {
  const focusState = options?.focusState;
  const activeFriendId = options?.activeFriendId ?? "all";
  const aggregateThreshold = options?.aggregateThreshold ?? DEFAULT_AGGREGATE_THRESHOLD;

  const recordByCourse = useMemo(() => new Map(records.map((r) => [r.courseId, r])), [records]);
  const friendById = useMemo(() => new Map(friends.map((f) => [f.id, f])), [friends]);

  const pins = useMemo<CoursePin[]>(() => {
    return courses
      .map((course) => {
        // Point-in-polygon against real state boundaries (not OSM's
        // frequently-missing address tags) both finds the state AND
        // doubles as the "is this course in the US at all" filter — d3's
        // geoAlbersUsa projects *any* point to *some* coordinate, so it
        // can't be used alone to detect non-US courses.
        const state = findState(course.lon, course.lat);
        if (!state) return null;
        if (focusState && state.name !== focusState) return null;
        const xy = projectPoint(course.lon, course.lat);
        if (!xy) return null;
        const record = recordByCourse.get(course.id) ?? null;
        const holder = record ? friendById.get(record.holderUserId) ?? null : null;
        return { course, record, holder, state, xy };
      })
      .filter((p): p is CoursePin => p !== null);
  }, [courses, recordByCourse, friendById, focusState]);

  const visiblePins = useMemo(
    () => (activeFriendId === "all" ? pins : pins.filter((p) => p.holder?.id === activeFriendId)),
    [pins, activeFriendId]
  );

  const { badgePins, loosePins } = useMemo(() => {
    if (focusState) return { badgePins: [] as StateBadge[], loosePins: visiblePins };
    const byState = new Map<string, CoursePin[]>();
    const loose: CoursePin[] = [];
    for (const p of visiblePins) {
      const list = byState.get(p.state.name) ?? [];
      list.push(p);
      byState.set(p.state.name, list);
    }
    const badges: StateBadge[] = [];
    for (const [stateName, list] of byState) {
      if (list.length > aggregateThreshold) {
        const centroid = stateCentroid(stateName);
        if (centroid) {
          badges.push({ stateName, count: list.length, xy: centroid });
          continue;
        }
      }
      loose.push(...list);
    }
    return { badgePins: badges, loosePins: loose };
  }, [visiblePins, focusState, aggregateThreshold]);

  const countByFriend = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of pins) if (p.holder) m.set(p.holder.id, (m.get(p.holder.id) ?? 0) + 1);
    return m;
  }, [pins]);

  const unclaimedCount = useMemo(() => pins.filter((p) => !p.holder).length, [pins]);

  return { pins, visiblePins, badgePins, loosePins, countByFriend, unclaimedCount };
}
