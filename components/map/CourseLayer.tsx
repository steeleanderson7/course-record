"use client";

import { Layer, Source } from "react-map-gl/maplibre";
import type { CircleLayerSpecification, SymbolLayerSpecification } from "maplibre-gl";
import type { Course, CourseRecord, Friend } from "@/lib/types";

type Props = {
  courses: Course[];
  records: CourseRecord[];
  friends: Friend[];
};

const clusterLayer: CircleLayerSpecification = {
  id: "course-clusters",
  type: "circle",
  source: "courses",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": "#475569",
    "circle-radius": ["step", ["get", "point_count"], 14, 5, 18, 15, 24],
    "circle-opacity": 0.85,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#ffffff",
  },
};

const clusterCountLayer: SymbolLayerSpecification = {
  id: "course-cluster-count",
  type: "symbol",
  source: "courses",
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-size": 12,
    "text-font": ["Noto Sans Regular"],
  },
  paint: { "text-color": "#ffffff" },
};

const pointLayer: CircleLayerSpecification = {
  id: "course-points",
  type: "circle",
  source: "courses",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": ["get", "color"],
    "circle-radius": 7,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#ffffff",
  },
};

export function CourseLayer({ courses, records, friends }: Props) {
  const recordByCourse = new Map(records.map((r) => [r.courseId, r]));
  const colorByUser = new Map(friends.map((f) => [f.id, f.color]));

  const geojson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: courses.map((course) => {
      const record = recordByCourse.get(course.id);
      const color = record ? colorByUser.get(record.holderUserId) ?? "#94a3b8" : "#94a3b8";
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [course.lon, course.lat] },
        properties: {
          courseId: course.id,
          name: course.name,
          color,
          holderUserId: record?.holderUserId ?? null,
          score: record?.score ?? null,
        },
      };
    }),
  };

  return (
    <Source
      id="courses"
      type="geojson"
      data={geojson}
      cluster
      clusterRadius={50}
      clusterMaxZoom={6}
    >
      <Layer {...clusterLayer} />
      <Layer {...clusterCountLayer} />
      <Layer {...pointLayer} />
    </Source>
  );
}
