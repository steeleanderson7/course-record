import { geoAlbersUsa, geoContains, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature, neighbors } from "topojson-client";
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

/**
 * Real land adjacency between states, derived from shared TopoJSON arcs
 * (not a hand-curated list) — e.g. correctly omits Michigan/Minnesota
 * despite their proximity, since Lake Superior separates them with no
 * shared border arc. `topojson-client`'s `neighbors()` returns geometry
 * indices parallel to `statesGeometry.geometries`, which `feature()` above
 * preserves 1:1 into `US_STATE_FEATURES` — so index i in both arrays always
 * refers to the same state. Used by `lib/geo/stateMapDetail.ts` to pick a
 * real neighboring state's name for the "surrounding territory" label.
 * States sharing no arc with anything (Alaska, Hawaii) correctly come back
 * with an empty array.
 */
export const STATE_NEIGHBORS: Record<string, string[]> = (() => {
  const adjacency = neighbors(statesGeometry.geometries);
  const result: Record<string, string[]> = {};
  US_STATE_FEATURES.forEach((f, i) => {
    result[f.properties.name] = adjacency[i].map((j) => US_STATE_FEATURES[j].properties.name);
  });
  return result;
})();

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
