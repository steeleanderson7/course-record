import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const radius = searchParams.get("radius") ?? "50000"; // meters

  if (!q && !(lat && lon)) {
    return NextResponse.json({ courses: [] });
  }

  const supabase = await createClient();

  if (lat && lon) {
    const { data, error } = await supabase.rpc("find_similar_courses", {
      p_name: q ?? "",
      p_lat: Number(lat),
      p_lon: Number(lon),
      p_radius_m: Number(radius),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ courses: data });
  }

  const { data, error } = await supabase
    .from("courses")
    .select("id, name, city, country_code, lat, lon")
    .ilike("name", `%${q}%`)
    .order("name")
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ courses: data });
}
