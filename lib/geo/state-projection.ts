import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { US_STATE_FEATURES, type StateFeature } from "@/lib/geo/us-projection";

const PAD_PX = 40;

export type FittedStateProjection = {
  feature: StateFeature;
  projection: ReturnType<typeof geoMercator>;
  path: ReturnType<typeof geoPath>;
};

/** True if a geometry's raw coordinates span more than 180° of longitude —
 *  the signature of a feature whose islands straddle the antimeridian
 *  (only Alaska, among the 50 states: islands at ~-179° and ~+179°, a real
 *  gap of ~1° that an unrotated projection reads as ~360° wide). */
function lonSpanExceeds180(geometry: GeoJSON.Geometry): boolean {
  let min = Infinity;
  let max = -Infinity;
  const visit = (coords: unknown): void => {
    if (typeof (coords as number[])[0] === "number") {
      const lon = (coords as number[])[0];
      if (lon < min) min = lon;
      if (lon > max) max = lon;
    } else {
      for (const c of coords as unknown[]) visit(c);
    }
  };
  visit((geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon).coordinates);
  return max - min > 180;
}

/**
 * A Mercator projection fitted tightly to ONE state's real TopoJSON border —
 * deliberately not a crop of the shared national Albers-USA projection
 * (`US_PROJECTION` in us-projection.ts), which is tuned for whole-country
 * framing (and insets Alaska/Hawaii, irrelevant here). Works for any of the
 * 50 states by name, so a state drill-down view gets its own full canvas
 * rather than whatever slice Albers-USA happens to put it in.
 */
export function fitStateProjection(
  stateName: string,
  width: number,
  height: number
): FittedStateProjection | null {
  const feature = US_STATE_FEATURES.find((f) => f.properties.name === stateName);
  if (!feature) return null;

  // Left unrotated, Alaska's antimeridian-straddling islands make
  // `fitExtent` treat the feature as nearly as wide as the whole globe and
  // squash the fit to a ~75px sliver. Rotating 180° first moves the seam to
  // the Pacific, where Alaska has no territory, giving it the same
  // full-canvas fit every other state gets — `fitExtent` just computes
  // scale+translate against whatever projection it's handed, so a rotate
  // applied beforehand is fully compatible with it.
  const base = lonSpanExceeds180(feature.geometry) ? geoMercator().rotate([180, 0]) : geoMercator();
  const projection = base.fitExtent(
    [
      [PAD_PX, PAD_PX],
      [width - PAD_PX, height - PAD_PX],
    ],
    feature as GeoPermissibleObjects
  );
  const path = geoPath(projection);
  return { feature, projection, path };
}
