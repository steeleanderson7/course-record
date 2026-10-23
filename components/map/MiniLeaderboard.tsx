"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { CourseRecord, Friend } from "@/lib/types";

type Props = {
  friends: Friend[];
  records: CourseRecord[];
};

export function MiniLeaderboard({ friends, records }: Props) {
  const countByUser = new Map<string, number>();
  for (const r of records) {
    countByUser.set(r.holderUserId, (countByUser.get(r.holderUserId) ?? 0) + 1);
  }

  const ranked = friends
    .map((f) => ({ friend: f, count: countByUser.get(f.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <Card className="w-48 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Leaderboard (in view)
      </p>
      <ol className="space-y-1.5">
        {ranked.map(({ friend, count }, i) => (
          <li key={friend.id} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="w-3 text-xs text-muted-foreground">{i + 1}.</span>
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: friend.color }}
              />
              {friend.name}
            </span>
            <span className="font-mono text-xs">{count}</span>
          </li>
        ))}
      </ol>
      <Link
        href="/leaderboard"
        className="mt-2 block text-xs font-medium text-blue-600 hover:underline"
      >
        Full leaderboard &rarr;
      </Link>
    </Card>
  );
}
