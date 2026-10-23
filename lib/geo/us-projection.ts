import { geoAlbersUsa, geoContains, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import usAtlas from "us-atlas/states-10m.json";
import { STATE_ABBREVIATIONS } from "@/lib/geo/us-states";

export type StateFeature = GeoJSON.Feature<GeoJSON.Geometry, { name: string }>;

// Classic Albers-USA 960x600 convention (scale 1070 / translate [480,300]) —
// matches the design reference's viewBox and insets Alaska/Hawaii automatically.
export const US_PROJECTION = geoAlbersUsa().scale(1070).translate([480, 300]);
export const US_PATH = geoPath(US_PROJECTION);

const topology = usAtlas as unknown as Topology;
const statesGeometry = topology.objects.states as GeometryCollection;

export const US_STATE_FEATURES = (
  feature(topology, statesGeometry) as unknown as GeoJSON.FeatureCollection<GeoJSON.Geometry, { name: string }>
).features;

/** Projects [lon, lat] to [x, y] in the shared 960x600 space, or null if it falls outside all US insets. */
export function projectPoint(lon: number, lat: number): [number, number] | null {
  return US_PROJECTION([lon, lat]);
}

/**
 * Finds which US state a point falls in via point-in-polygon, not OSM's
 * (frequently missing) address tags — reliable for any real course
 * regardless of how well it's tagged.
 */
export function findState(lon: number, lat: number): { name: string; abbr: string } | null {
  const point: [number, number] = [lon, lat];
  for (const f of US_STATE_FEATURES) {
    if (geoContains(f as GeoPermissibleObjects, point)) {
      return { name: f.properties.name, abbr: STATE_ABBREVIATIONS[f.properties.name] ?? "" };
    }
  }
  return null;
}

export function stateCentroid(stateName: string): [number, number] | null {
  const f = US_STATE_FEATURES.find((s) => s.properties.name === stateName);
  if (!f) return null;
  return US_PATH.centroid(f as GeoPermissibleObjects) as [number, number];
}

export function stateBounds(stateName: string): [[number, number], [number, number]] | null {
  const f = US_STATE_FEATURES.find((s) => s.properties.name === stateName);
  if (!f) return null;
  return US_PATH.bounds(f as GeoPermissibleObjects) as [[number, number], [number, number]];
}
