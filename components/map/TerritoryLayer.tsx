"use client";

import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import type { FillLayerSpecification, LineLayerSpecification } from "maplibre-gl";
import { buildTerritoryGeoJSON } from "@/lib/geo/voronoi";
import type { Course, CourseRecord, Friend } from "@/lib/types";

type Props = {
  courses: Course[];
  records: CourseRecord[];
  friends: Friend[];
};

const fillLayer: FillLayerSpecification = {
  id: "territory-fill",
  type: "fill",
  source: "territory",
  paint: { "fill-color": ["get", "color"], "fill-opacity": 0.35 },
};

const outlineLayer: LineLayerSpecification = {
  id: "territory-outline",
  type: "line",
  source: "territory",
  paint: { "line-color": ["get", "color"], "line-width": 1, "line-opacity": 0.8 },
};

export function TerritoryLayer({ courses, records, friends }: Props) {
  const colorByUser = useMemo(() => new Map(friends.map((f) => [f.id, f.color])), [friends]);

  const geojson = useMemo(
    () => buildTerritoryGeoJSON(courses, records, (userId) => colorByUser.get(userId) ?? "#94a3b8"),
    [courses, records, colorByUser]
  );

  return (
    <Source id="territory" type="geojson" data={geojson}>
      <Layer {...fillLayer} />
      <Layer {...outlineLayer} />
    </Source>
  );
}
