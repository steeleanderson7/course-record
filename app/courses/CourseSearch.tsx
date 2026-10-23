"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type CourseResult = {
  id: string;
  name: string;
  city: string | null;
  country_code: string | null;
};

export function CourseSearch() {
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
    <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
        <p className="text-sm text-muted-foreground">
          Search across 31,000+ courses seeded from OpenStreetMap.
        </p>
      </div>

      <Input
        placeholder="Search by course name..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="space-y-2">
        {results.map((course) => (
          <Link key={course.id} href={`/courses/${course.id}`}>
            <Card className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50">
              <div>
                <p className="font-medium">{course.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[course.city, course.country_code].filter(Boolean).join(", ") || "Location unknown"}
                </p>
              </div>
            </Card>
          </Link>
        ))}
        {query.trim().length >= 2 && !loading && results.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No courses match &ldquo;{query}&rdquo;.
          </p>
        )}
        {query.trim().length < 2 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Type at least 2 characters to search.
          </p>
        )}
      </div>
    </div>
  );
}
