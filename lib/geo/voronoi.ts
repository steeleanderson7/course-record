import { geoVoronoi } from "d3-geo-voronoi";
import type { Course, CourseRecord } from "@/lib/types";

export type TerritoryFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, {
  courseId: string;
  courseName: string;
  holderUserId: string;
  color: string;
}>;

/**
 * Builds a spherical Voronoi tessellation over the given courses, one cell
 * per course, colored by whichever friend holds that course's record.
 * Spherical (not planar) math matters here because courses span the whole
 * globe, including the antimeridian/poles, where planar Voronoi distorts.
 */
export function buildTerritoryGeoJSON(
  courses: Course[],
  records: CourseRecord[],
  friendColor: (userId: string) => string
): GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, TerritoryFeature["properties"]> {
  const recordByCourse = new Map(records.map((r) => [r.courseId, r]));
  const owned = courses.filter((c) => recordByCourse.has(c.id));

  if (owned.length < 2) {
    return { type: "FeatureCollection", features: [] };
  }

  const points: GeoJSON.FeatureCollection<GeoJSON.Point, { courseId: string }> = {
    type: "FeatureCollection",
    features: owned.map((c) => ({
      type: "Feature",
      properties: { courseId: c.id },
      geometry: { type: "Point", coordinates: [c.lon, c.lat] },
    })),
  };

  const polygons = geoVoronoi(points as never).polygons(points as never) as GeoJSON.FeatureCollection<
    GeoJSON.Polygon | GeoJSON.MultiPolygon,
    { site: { properties: { courseId: string } } }
  >;

  const features: TerritoryFeature[] = polygons.features.map((feature, i) => {
    const course = owned[i];
    const record = recordByCourse.get(course.id)!;
    return {
      type: "Feature",
      geometry: feature.geometry,
      properties: {
        courseId: course.id,
        courseName: course.name,
        holderUserId: record.holderUserId,
        color: friendColor(record.holderUserId),
      },
    };
  });

  return { type: "FeatureCollection", features };
}
