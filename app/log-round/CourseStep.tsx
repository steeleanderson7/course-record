"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { WizardProgress } from "@/components/log-round/WizardProgress";
import { BRAND_COLORS } from "@/lib/colors";

type CourseResult = { id: string; name: string; city: string | null; country_code: string | null };

export function CourseStep() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CourseResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    const timeout = setTimeout(async () => {
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      const res = await fetch(`/api/courses/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.courses ?? []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-7 px-6 py-10">
      <div className="flex items-center justify-between">
        <WizardProgress step={1} label="Choose a course" />
        <Link href="/dashboard" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          Cancel
        </Link>
      </div>

      <div className="space-y-2">
        <h1 className="font-heading text-[28px] font-bold">Which course did you play?</h1>
        <p className="text-sm text-muted-foreground">Search by name — any of our 31,000+ courses.</p>
      </div>

      <Input
        autoFocus
        placeholder="Search courses..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-12 rounded-[10px] text-base"
      />

      <div className="flex flex-col gap-2">
        {results.map((course) => (
          <button
            key={course.id}
            onClick={() => router.push(`/log-round/score?courseId=${course.id}`)}
            className="hover-lift flex items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary"
          >
            <div>
              <p className="text-sm font-bold">{course.name}</p>
              <p className="text-xs text-muted-foreground">
                {[course.city, course.country_code].filter(Boolean).join(", ") || "Location unknown"}
              </p>
            </div>
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
              style={{ borderColor: BRAND_COLORS.unclaimed }}
            />
          </button>
        ))}
        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No courses match &ldquo;{query}&rdquo;.
          </p>
        )}
        {query.trim().length < 2 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Type at least 2 characters to search.
          </p>
        )}
      </div>
    </div>
  );
}
