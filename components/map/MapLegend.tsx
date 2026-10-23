"use client";

import { Card } from "@/components/ui/card";
import type { CourseRecord, Friend } from "@/lib/types";

type Props = {
  friends: Friend[];
  records: CourseRecord[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
};

export function MapLegend({ friends, records, selectedIds, onToggle }: Props) {
  const countByUser = new Map<string, number>();
  for (const r of records) {
    countByUser.set(r.holderUserId, (countByUser.get(r.holderUserId) ?? 0) + 1);
  }

  return (
    <Card className="w-48 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Legend / filter
      </p>
      <ul className="space-y-1.5">
        {friends.map((friend) => {
          const active = selectedIds.has(friend.id);
          return (
            <li key={friend.id}>
              <button
                type="button"
                onClick={() => onToggle(friend.id)}
                className={`flex w-full items-center justify-between rounded px-1.5 py-1 text-sm transition-opacity ${
                  active ? "" : "opacity-35"
                } hover:bg-muted`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: friend.color }}
                  />
                  {friend.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {countByUser.get(friend.id) ?? 0}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
