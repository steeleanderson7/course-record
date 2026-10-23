import { geoMercator, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { US_STATE_FEATURES, type StateFeature } from "@/lib/geo/us-projection";

const PAD_PX = 40;

export type FittedStateProjection = {
  feature: StateFeature;
  projection: ReturnType<typeof geoMercator>;
  path: ReturnType<typeof geoPath>;
};

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

  const projection = geoMercator().fitExtent(
    [
      [PAD_PX, PAD_PX],
      [width - PAD_PX, height - PAD_PX],
    ],
    feature as GeoPermissibleObjects
  );
  const path = geoPath(projection);
  return { feature, projection, path };
}
