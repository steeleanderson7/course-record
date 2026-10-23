declare module "d3-geo-voronoi" {
  export function geoVoronoi(data?: unknown): {
    polygons: (data?: unknown) => GeoJSON.FeatureCollection;
  };
}
