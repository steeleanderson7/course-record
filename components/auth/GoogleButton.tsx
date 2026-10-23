"use client";

import { useState } from "react";

/**
 * Styled per the design, but not wired to real Google OAuth yet — that
 * needs its own Google Cloud OAuth client + Supabase provider config,
 * which is a separate setup step. Clicking shows an explanation instead
 * of erroring or silently doing nothing.
 */
export function GoogleButton() {
  const [showNote, setShowNote] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setShowNote(true)}
        className="hover-lift flex items-center justify-center gap-2.5 rounded-lg border border-input bg-card py-3 text-sm font-semibold"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
        </svg>
        Continue with Google
      </button>
      {showNote && (
        <p className="motion-safe:animate-in motion-safe:fade-in text-xs text-muted-foreground">
          Google sign-in isn&apos;t set up yet — use email below for now.
        </p>
      )}
    </div>
  );
}
