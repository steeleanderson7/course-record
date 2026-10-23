"use client";

import Link from "next/link";
import { Popup } from "react-map-gl/maplibre";
import type { Course, Friend, Round } from "@/lib/types";

type Props = {
  course: Course;
  rounds: Round[];
  friendById: (id: string) => Friend | undefined;
  onClose: () => void;
};

export function CoursePopup({ course, rounds, friendById, onClose }: Props) {
  const ranked = [...rounds]
    .filter((r) => r.courseId === course.id && r.holesPlayed === 18)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  return (
    <Popup
      longitude={course.lon}
      latitude={course.lat}
      onClose={onClose}
      closeOnClick={false}
      anchor="bottom"
      offset={12}
    >
      <div className="min-w-[220px] space-y-2 p-1">
        <div>
          <p className="font-semibold leading-tight">{course.name}</p>
          <p className="text-xs text-muted-foreground">
            {course.city}, {course.country}
          </p>
        </div>
        <ul className="space-y-1 text-sm">
          {ranked.map((round, i) => {
            const friend = friendById(round.userId);
            return (
              <li key={round.id} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  {i === 0 && <span aria-hidden>🏆</span>}
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: friend?.color }}
                  />
                  {friend?.name ?? "Unknown"}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {round.score} &middot; {round.datePlayed}
                </span>
              </li>
            );
          })}
          {ranked.length === 0 && (
            <li className="text-xs text-muted-foreground">No rounds logged yet.</li>
          )}
        </ul>
        <Link
          href={`/courses/${course.id}`}
          className="block text-xs font-medium text-blue-600 hover:underline"
        >
          View course details &rarr;
        </Link>
      </div>
    </Popup>
  );
}
