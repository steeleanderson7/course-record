import type { ActivityItem } from "@/lib/queries";

export function relativeToPar(score: number, par: number): string {
  const diff = score - par;
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff}` : `${diff}`;
}

export function activityText(item: ActivityItem, viewerUserId: string): string {
  const isYou = item.actorUserId === viewerUserId;
  const actor = isYou ? "You" : item.actorName;

  switch (item.kind) {
    case "claimed":
      return `${actor} claimed ${item.courseName}`;
    case "broke-your-record":
      return `${actor} broke your record at ${item.courseName}`;
    case "reclaimed-from":
      return `You reclaimed ${item.courseName} from ${item.previousHolderName}`;
    case "took-from":
      return `${actor} took ${item.courseName} from ${item.previousHolderName}`;
    case "logged":
    default: {
      const scoreSuffix =
        item.par != null
          ? ` — ${item.score} (${relativeToPar(item.score, item.par)})`
          : ` — ${item.score}`;
      return `${actor} logged a round at ${item.courseName}${scoreSuffix}`;
    }
  }
}
