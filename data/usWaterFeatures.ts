/**
 * Real, genuinely-recognizable water features for the state-view territory
 * map — conservative by design (per the design handoff's "skip it for a
 * state with nothing recognizable rather than inventing one"). Most states
 * have no entry here at all, which is correct, not an oversight.
 *
 * Each feature is defined ONCE in real lon/lat and reused across every
 * state that borders it — a Mercator fit is pure scale+translate, so
 * projecting a feature that extends past one state's own canvas is
 * well-behaved (it just clips at the SVG viewBox edge, same as any
 * off-canvas content). Polygons are hand-approximated closed rings, not
 * survey-grade — fine for a stylized map (see `data/usStateCities.ts`'s
 * header for the same caveat).
 *
 * No river border-lines (Mississippi, Ohio, Colorado, etc.) in this pass —
 * a thin ribbon traced accurately along a real state border is meaningfully
 * more work than a closed lake/bay blob for a comparatively small visual
 * payoff, so this stays lake/bay/sound-only.
 */

export type WaterFeature = {
  name: string;
  /** Closed ring, [lon, lat] pairs — do not repeat the first point at the end. */
  polygon: [number, number][];
  /** Which states' maps should render this feature. */
  states: string[];
};

export const US_WATER_FEATURES: WaterFeature[] = [
  {
    name: "Great Salt Lake",
    polygon: [
      [-112.55, 41.7],
      [-112.9, 41.65],
      [-112.98, 41.4],
      [-112.85, 41.15],
      [-112.6, 40.95],
      [-112.3, 40.95],
      [-112.18, 41.15],
      [-112.25, 41.4],
      [-112.4, 41.6],
    ],
    states: ["Utah"],
  },
  {
    name: "Utah Lake",
    polygon: [
      [-111.95, 40.38],
      [-111.8, 40.4],
      [-111.7, 40.3],
      [-111.73, 40.2],
      [-111.85, 40.17],
      [-111.95, 40.25],
    ],
    states: ["Utah"],
  },
  {
    name: "Lake Powell",
    polygon: [
      [-111.48, 37.3],
      [-111.1, 37.25],
      [-110.7, 37.15],
      [-110.3, 37.05],
      [-110.05, 36.95],
      [-110.15, 36.85],
      [-110.5, 36.95],
      [-110.9, 37.05],
      [-111.25, 37.15],
    ],
    states: ["Utah", "Arizona"],
  },
  {
    name: "Lake Michigan",
    polygon: [
      [-87.0, 45.8],
      [-85.7, 45.5],
      [-85.0, 44.5],
      [-85.0, 43.0],
      [-85.5, 41.9],
      [-86.5, 41.6],
      [-87.5, 41.7],
      [-88.0, 42.5],
      [-87.9, 43.8],
      [-87.8, 45.0],
      [-87.3, 45.7],
    ],
    states: ["Illinois", "Indiana", "Michigan", "Wisconsin"],
  },
  {
    name: "Lake Superior",
    polygon: [
      [-92.0, 46.8],
      [-90.5, 46.6],
      [-88.5, 47.0],
      [-86.5, 47.5],
      [-85.0, 47.0],
      [-84.5, 46.6],
      [-85.5, 46.4],
      [-87.5, 46.5],
      [-89.5, 46.6],
      [-91.0, 46.6],
    ],
    states: ["Michigan", "Minnesota", "Wisconsin"],
  },
  {
    name: "Lake Huron",
    polygon: [
      [-84.0, 45.8],
      [-82.5, 45.9],
      [-81.0, 45.3],
      [-80.0, 44.0],
      [-80.0, 43.2],
      [-81.5, 43.0],
      [-82.8, 43.6],
      [-83.6, 44.3],
      [-84.0, 45.0],
    ],
    states: ["Michigan"],
  },
  {
    name: "Lake Erie",
    polygon: [
      [-83.2, 41.7],
      [-82.5, 41.5],
      [-81.3, 41.5],
      [-80.0, 42.2],
      [-79.2, 42.6],
      [-79.6, 42.85],
      [-80.8, 42.6],
      [-82.0, 42.2],
      [-83.0, 42.0],
    ],
    states: ["Ohio", "Pennsylvania", "New York"],
  },
  {
    name: "Lake Ontario",
    polygon: [
      [-79.5, 43.6],
      [-78.5, 43.3],
      [-77.5, 43.3],
      [-76.5, 43.6],
      [-76.3, 44.0],
      [-77.3, 44.2],
      [-78.5, 43.9],
      [-79.3, 43.9],
    ],
    states: ["New York"],
  },
  {
    name: "Finger Lakes",
    polygon: [
      [-76.9, 42.9],
      [-76.7, 42.85],
      [-76.75, 42.5],
      [-76.95, 42.45],
      [-77.05, 42.6],
      [-76.9, 42.9],
    ],
    states: ["New York"],
  },
  {
    name: "Lake Champlain",
    polygon: [
      [-73.4, 45.0],
      [-73.15, 44.8],
      [-73.2, 44.4],
      [-73.35, 44.0],
      [-73.45, 44.3],
      [-73.45, 44.7],
    ],
    states: ["Vermont", "New York"],
  },
  {
    name: "Lake Tahoe",
    polygon: [
      [-120.12, 39.23],
      [-120.0, 39.27],
      [-119.94, 39.17],
      [-119.97, 39.0],
      [-120.05, 38.93],
      [-120.14, 39.0],
      [-120.14, 39.15],
    ],
    states: ["California", "Nevada"],
  },
  {
    name: "Lake Mead",
    polygon: [
      [-114.75, 36.15],
      [-114.6, 36.38],
      [-114.4, 36.3],
      [-114.2, 36.15],
      [-114.05, 36.0],
      [-114.25, 35.95],
      [-114.5, 36.0],
      [-114.65, 36.1],
    ],
    states: ["Arizona", "Nevada"],
  },
  {
    name: "San Francisco Bay",
    polygon: [
      [-122.45, 37.9],
      [-122.3, 38.05],
      [-122.1, 37.95],
      [-122.05, 37.6],
      [-122.15, 37.45],
      [-122.3, 37.45],
      [-122.45, 37.6],
      [-122.5, 37.75],
    ],
    states: ["California"],
  },
  {
    name: "Chesapeake Bay",
    polygon: [
      [-76.3, 39.5],
      [-76.0, 39.3],
      [-76.05, 38.8],
      [-76.2, 38.2],
      [-76.3, 37.6],
      [-76.1, 37.0],
      [-75.95, 36.95],
      [-76.0, 37.5],
      [-76.1, 38.0],
      [-76.15, 38.6],
      [-76.25, 39.0],
    ],
    states: ["Maryland", "Virginia"],
  },
  {
    name: "Puget Sound",
    polygon: [
      [-122.9, 48.2],
      [-122.6, 48.25],
      [-122.4, 47.9],
      [-122.3, 47.5],
      [-122.5, 47.1],
      [-122.8, 47.0],
      [-123.0, 47.3],
      [-122.95, 47.7],
      [-122.9, 48.0],
    ],
    states: ["Washington"],
  },
  {
    name: "Lake Okeechobee",
    polygon: [
      [-81.1, 26.95],
      [-80.95, 27.1],
      [-80.75, 27.05],
      [-80.65, 26.9],
      [-80.75, 26.72],
      [-80.95, 26.72],
      [-81.08, 26.8],
    ],
    states: ["Florida"],
  },
  {
    name: "Narragansett Bay",
    polygon: [
      [-71.4, 41.85],
      [-71.25, 41.8],
      [-71.2, 41.6],
      [-71.3, 41.45],
      [-71.4, 41.5],
      [-71.42, 41.7],
    ],
    states: ["Rhode Island"],
  },
  {
    name: "Flathead Lake",
    polygon: [
      [-114.25, 47.98],
      [-114.1, 47.97],
      [-114.05, 47.8],
      [-114.12, 47.7],
      [-114.25, 47.75],
      [-114.28, 47.9],
    ],
    states: ["Montana"],
  },
];

export function getStateWaterFeatures(stateName: string): WaterFeature[] {
  return US_WATER_FEATURES.filter((w) => w.states.includes(stateName));
}
