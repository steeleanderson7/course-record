"use client";

import { useState } from "react";

/**
 * Pure client-side visibility toggle — the category sections themselves are
 * rendered server-side (so data fetching/SEO/first-paint stay on the
 * server) and passed in as pre-built JSX, keyed by category. This component
 * only decides which of them to show.
 */
export function BadgeCategoryFilter({
  categories,
  sections,
}: {
  categories: string[];
  sections: Record<string, React.ReactNode>;
}) {
  const [active, setActive] = useState<string>("All");

  return (
    <div className="flex flex-col gap-9">
      <div className="flex flex-wrap gap-2.5">
        {["All", ...categories].map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(cat)}
            className={`rounded-full px-4 py-[7px] text-[13px] font-semibold whitespace-nowrap ${
              active === cat
                ? "bg-sidebar text-sidebar-foreground"
                : "border border-input bg-card text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-9">
        {categories
          .filter((cat) => active === "All" || active === cat)
          .map((cat) => (
            <div key={cat}>{sections[cat]}</div>
          ))}
      </div>
    </div>
  );
}
