import { redirect } from "next/navigation";

// The national territory map now lives on the Dashboard (same
// TerritoryMapClient component, same data) — "Map" was dropped from the
// main nav since there's no longer a reason to keep a duplicate page
// fetching and rendering the identical thing. Redirecting (not deleting
// the route outright) keeps any existing bookmarks/links working.
export default function MapPage() {
  redirect("/dashboard");
}
