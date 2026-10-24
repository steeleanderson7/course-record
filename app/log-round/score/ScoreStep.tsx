"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WizardProgress } from "@/components/log-round/WizardProgress";
import { createRound } from "@/app/actions/rounds";
import { BRAND_COLORS } from "@/lib/colors";

type Props = {
  groupId: string;
  course: { id: string; name: string; location: string; par: number | null };
  currentRecord: { score: number; holderName: string } | null;
};

function relativeToPar(score: number, par: number): string {
  const diff = score - par;
  if (diff === 0) return "Even par";
  return diff > 0 ? `${diff} over par` : `${Math.abs(diff)} under par`;
}

export function ScoreStep({ groupId, course, currentRecord }: Props) {
  const router = useRouter();
  const [score, setScore] = useState(course.par ?? 80);
  const [datePlayed, setDatePlayed] = useState(() => new Date().toISOString().slice(0, 10));
  const [tees, setTees] = useState("");
  const [holes, setHoles] = useState<"18" | "9">("18");
  // Kept as strings (not numbers) so an empty field is distinguishable from
  // an explicit 0 — "didn't report" vs. "reported zero" — even though both
  // coalesce to 0 in the lifetime badge totals either way.
  const [birdies, setBirdies] = useState("");
  const [eaglesPlus, setEaglesPlus] = useState("");
  const [aces, setAces] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const result = await createRound({
        groupId,
        courseId: course.id,
        score,
        holesPlayed: Number(holes) as 9 | 18,
        datePlayed,
        notes: tees ? `Tees: ${tees}` : undefined,
        birdies: birdies ? Number(birdies) : undefined,
        eaglesPlus: eaglesPlus ? Number(eaglesPlus) : undefined,
        aces: aces ? Number(aces) : undefined,
      });
      const params = new URLSearchParams({
        courseId: course.id,
        score: String(score),
        isNewRecord: String(result.isNewRecord),
        pointsEarned: String(result.pointsEarned),
        isMarquee: String(result.isMarquee),
      });
      if (result.previousHolderName) params.set("previousHolderName", result.previousHolderName);
      if (result.previousScore != null) params.set("previousScore", String(result.previousScore));
      router.push(`/log-round/result?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log that round.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-7 px-6 py-10">
      <div className="flex items-center justify-between">
        <WizardProgress step={2} label="Enter your score" />
        <Link href="/dashboard" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          Cancel
        </Link>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
        <div>
          <p className="font-heading text-lg font-bold">{course.name}</p>
          <p className="text-xs text-muted-foreground">{course.location}</p>
        </div>
        {currentRecord && (
          <p className="text-right text-xs text-muted-foreground">
            Course record: <span className="font-bold text-primary">{currentRecord.score}</span> —{" "}
            {currentRecord.holderName}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date played</Label>
          <Input id="date" type="date" value={datePlayed} onChange={(e) => setDatePlayed(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tees">Tees played (optional)</Label>
          <Input id="tees" placeholder="e.g. Blue" value={tees} onChange={(e) => setTees(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Holes played</Label>
        <ToggleGroup type="single" value={holes} onValueChange={(v) => v && setHoles(v as "18" | "9")}>
          <ToggleGroupItem value="18">18 holes</ToggleGroupItem>
          <ToggleGroupItem value="9">9 holes</ToggleGroupItem>
        </ToggleGroup>
        <p className="text-xs text-muted-foreground">
          Only 18-hole rounds count toward the course record.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Notable shots (optional)</Label>
        <div className="grid grid-cols-3 gap-3">
          <Input
            type="number"
            min={0}
            placeholder="Birdies"
            aria-label="Birdies"
            value={birdies}
            onChange={(e) => setBirdies(e.target.value)}
          />
          <Input
            type="number"
            min={0}
            placeholder="Eagles+"
            aria-label="Eagles or better"
            value={eaglesPlus}
            onChange={(e) => setEaglesPlus(e.target.value)}
          />
          <Input
            type="number"
            min={0}
            placeholder="Holes-in-one"
            aria-label="Holes-in-one"
            value={aces}
            onChange={(e) => setAces(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">Counts toward your Scoring badges — leave blank if you&apos;re not tracking these.</p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Total score</p>
        <div className="flex items-center gap-6">
          <button
            onClick={() => setScore((s) => Math.max(1, s - 1))}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-xl font-bold transition-transform hover:scale-105 active:scale-95"
            aria-label="Decrease score"
          >
            −
          </button>
          <span className="font-heading min-w-[90px] text-center text-5xl font-bold" style={{ color: BRAND_COLORS.ink }}>
            {score}
          </span>
          <button
            onClick={() => setScore((s) => s + 1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-xl font-bold transition-transform hover:scale-105 active:scale-95"
            aria-label="Increase score"
          >
            +
          </button>
        </div>
        {course.par != null && (
          <p className="font-bold text-primary">{relativeToPar(score, course.par)}</p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col items-center gap-3">
        <Button onClick={handleSubmit} disabled={loading} className="w-full max-w-xs">
          {loading ? "Submitting..." : "Submit Round"}
        </Button>
        <Link href="/log-round" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
      </div>
    </div>
  );
}
