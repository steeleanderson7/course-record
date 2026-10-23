"use client";

import { useMemo, useState } from "react";
import Map, { NavigationControl, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CourseLayer } from "@/components/map/CourseLayer";
import { TerritoryLayer } from "@/components/map/TerritoryLayer";
import { CoursePopup } from "@/components/map/CoursePopup";
import { MapLegend } from "@/components/map/MapLegend";
import { MiniLeaderboard } from "@/components/map/MiniLeaderboard";
import type { Course, CourseRecord, Friend, Round } from "@/lib/types";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

type Props = {
  friends: Friend[];
  courses: Course[];
  records: CourseRecord[];
  rounds: Round[];
};

export function MapView({ friends, courses, records, rounds }: Props) {
  const [viewMode, setViewMode] = useState<"pins" | "territory">("pins");
  const [selectedFriendIds, setSelectedFriendIds] = useState(
    () => new Set(friends.map((f) => f.id))
  );
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const visibleRecords = useMemo(
    () => records.filter((r) => selectedFriendIds.has(r.holderUserId)),
    [records, selectedFriendIds]
  );

  const visibleCourses = useMemo(() => {
    const ownedCourseIds = new Set(visibleRecords.map((r) => r.courseId));
    return courses.filter((c) => ownedCourseIds.has(c.id));
  }, [courses, visibleRecords]);

  function toggleFriend(id: string) {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleClick(event: MapLayerMouseEvent) {
    const feature = event.features?.[0];
    if (feature?.layer?.id === "course-points") {
      setSelectedCourseId(feature.properties?.courseId as string);
    }
  }

  const selectedCourse = selectedCourseId
    ? courses.find((c) => c.id === selectedCourseId)
    : undefined;
  const friendById = (id: string) => friends.find((f) => f.id === id);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="w-56 shrink-0 space-y-3 overflow-y-auto border-r bg-muted/30 p-3">
        <MapLegend
          friends={friends}
          records={records}
          selectedIds={selectedFriendIds}
          onToggle={toggleFriend}
        />
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            View mode
          </p>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as "pins" | "territory")}
            className="w-full"
          >
            <ToggleGroupItem value="pins" className="flex-1">
              Pins
            </ToggleGroupItem>
            <ToggleGroupItem value="territory" className="flex-1">
              Territory
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="mt-2 text-xs text-muted-foreground">
            Territory is approximate — it shows nearest recorded course, not a
            literal boundary.
          </p>
        </div>
        {courses.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No course records yet — log a round to see it show up here.
          </p>
        )}
      </div>

      <div className="relative flex-1">
        <Map
          initialViewState={{ longitude: 10, latitude: 20, zoom: 1.4 }}
          mapStyle={MAP_STYLE}
          interactiveLayerIds={["course-points", "course-clusters"]}
          onClick={handleClick}
        >
          <NavigationControl position="top-right" />
          {viewMode === "territory" && (
            <TerritoryLayer courses={visibleCourses} records={visibleRecords} friends={friends} />
          )}
          <CourseLayer courses={visibleCourses} records={visibleRecords} friends={friends} />
          {selectedCourse && (
            <CoursePopup
              course={selectedCourse}
              rounds={rounds}
              friendById={friendById}
              onClose={() => setSelectedCourseId(null)}
            />
          )}
        </Map>

        <div className="pointer-events-none absolute right-3 top-3">
          <div className="pointer-events-auto">
            <MiniLeaderboard friends={friends} records={visibleRecords} />
          </div>
        </div>
      </div>
    </div>
  );
}
