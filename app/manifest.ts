import type { MetadataRoute } from "next";
import { BRAND_COLORS } from "@/lib/colors";

// Next's App Router manifest file convention — auto-discovered and linked
// into <head>, no manual <link rel="manifest"> needed. Reuses the icon
// assets app/icon.png (512x512) and app/apple-icon.png (180x180) already
// generate real favicon/apple-touch-icon routes for; no new image assets.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CourseRecord.golf",
    short_name: "CourseRecord",
    description:
      "Log the rounds you actually play, battle your friends for course records, and watch your territory grow with every win.",
    // Opens straight into the app, not the marketing page — an install
    // only makes sense for someone who already has an account.
    start_url: "/dashboard",
    display: "standalone",
    background_color: BRAND_COLORS.cream,
    theme_color: BRAND_COLORS.fairway,
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
