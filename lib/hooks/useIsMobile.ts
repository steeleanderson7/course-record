"use client";

import { useSyncExternalStore } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

// Matches the server-rendered desktop output (avoids a hydration mismatch)
// until the client snapshot takes over.
function getServerSnapshot() {
  return false;
}

/**
 * True only once we know the real viewport. Built on `useSyncExternalStore`
 * — the React-recommended primitive for exactly this "read then subscribe
 * to an external source" shape (a `matchMedia` listener here), rather than
 * a `useEffect` + `setState` pair, which synchronously updating state
 * inside an effect body (even just to read the initial value) triggers an
 * avoidable extra render.
 *
 * Only needed where a component owns genuinely expensive shared state that
 * would be wasteful to compute/render twice (see `StateMap`'s clustering +
 * projection pipeline) — everywhere else in this app, a plain Tailwind
 * `md:hidden` / `hidden md:block` dual-tree is the simpler, hydration-safe
 * choice and should be preferred over reaching for this hook.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
