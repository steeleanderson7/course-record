"use client";

import { useEffect } from "react";

/**
 * Backs up the browser's native hash-fragment scroll with an explicit one.
 * Native anchor scrolling on a full server-rendered page normally works
 * fine, but Next's App Router has a real history of intermittently missing
 * it on a cross-route client navigation (a race between the RSC payload
 * committing and the browser's own scroll attempt) — a miss here is silent
 * (no error, just doesn't scroll), so this is cheap insurance for the
 * badge-earned celebration's "View in Collection" deep link landing on the
 * right family card.
 */
export function HashScrollOnMount() {
  useEffect(() => {
    if (!window.location.hash) return;
    const el = document.getElementById(window.location.hash.slice(1));
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return null;
}
