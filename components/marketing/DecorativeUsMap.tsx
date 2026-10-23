import { US_PATH, US_STATE_FEATURES } from "@/lib/geo/us-projection";

/** Pure decoration for the marketing hero — reuses the real state boundary data (not user data), stroke-only. */
export function DecorativeUsMap() {
  return (
    <svg
      viewBox="0 0 960 600"
      style={{ width: "100%", height: "auto" }}
      role="img"
      aria-label="Stylized map of the United States representing territory you can claim"
    >
      {US_STATE_FEATURES.map((f) => (
        <path
          key={f.properties.name}
          d={US_PATH(f) ?? undefined}
          fill="none"
          stroke="#C9A227"
          strokeWidth={1}
          strokeOpacity={0.55}
        />
      ))}
    </svg>
  );
}
