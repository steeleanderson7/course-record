import { headers } from "next/headers";

/**
 * The current request's own origin (protocol + host) — used to build
 * absolute URLs (invite links, email redirect targets) that work correctly
 * whether we're on localhost, a Vercel deployment, or a future custom
 * domain, instead of hardcoding one domain name.
 */
export async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
