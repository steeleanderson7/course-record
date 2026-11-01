"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { WizardProgress } from "@/components/log-round/WizardProgress";
import { BRAND_COLORS } from "@/lib/colors";

type CourseResult = { id: string; name: string; city: string | null; country_code: string | null };
type RecentCourse = { id: string; name: string };

export function CourseStep({ recentCourses = [] }: { recentCourses?: RecentCourse[] }) {
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

  function goToScore(courseId: string) {
    router.push(`/log-round/score?courseId=${courseId}`);
  }

  const resultList = (
    <div className="flex flex-col gap-2">
      {results.map((course) => (
        <button
          key={course.id}
          onClick={() => goToScore(course.id)}
          className="hover-lift flex min-h-11 items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary"
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
        <p className="py-6 text-center text-sm text-muted-foreground">No courses match &ldquo;{query}&rdquo;.</p>
      )}
      {query.trim().length < 2 && (
        <p className="py-6 text-center text-sm text-muted-foreground">Type at least 2 characters to search.</p>
      )}
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-5 px-4 py-6 md:gap-7 md:px-6 md:py-10">
      <div className="flex items-center justify-between">
        <WizardProgress step={1} label="Choose a course" />
        <Link href="/dashboard" className="flex min-h-11 items-center text-sm font-semibold text-muted-foreground hover:text-foreground">
          Cancel
        </Link>
      </div>

      <div className="space-y-1 md:space-y-2">
        <h1 className="font-heading text-2xl font-bold md:text-[28px]">Which course did you play?</h1>
        <p className="text-sm text-muted-foreground">Search by name — any of our 31,000+ courses.</p>
      </div>

      <Input
        autoFocus
        placeholder="Search courses..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-12 rounded-[11px] text-base"
      />

      {/* "Recently Played" chips — mobile only, the fastest path back to a
          familiar course, which matters most for the exact use case this
          flow is built for (re-logging a round standing on the tee box). */}
      {recentCourses.length > 0 && query.trim().length < 2 && (
        <div className="flex flex-col gap-2 md:hidden">
          <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">Recently Played</p>
          <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-0.5">
            {recentCourses.map((c) => (
              <button
                key={c.id}
                onClick={() => goToScore(c.id)}
                className="min-h-11 flex-none rounded-full border border-input bg-card px-3.5 py-2 text-[12.5px] font-semibold whitespace-nowrap"
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {resultList}
    </div>
  );
}
