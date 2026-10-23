"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WizardProgress } from "@/components/log-round/WizardProgress";
import { Reveal } from "@/components/Reveal";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { LevelProgress } from "@/components/LevelProgress";

type Props = {
  course: { name: string; location: string; par: number | null };
  score: number;
  isNewRecord: boolean;
  previousHolderName: string | null;
  previousScore: number | null;
  pointsEarned: number;
  isMarquee: boolean;
  totalPointsAfter: number;
};

function relativeToPar(score: number, par: number): string {
  const diff = score - par;
  if (diff === 0) return "Even par";
  return diff > 0 ? `+${diff}` : `${diff}`;
}

export function ResultStep({
  course,
  score,
  isNewRecord,
  previousHolderName,
  previousScore,
  pointsEarned,
  isMarquee,
  totalPointsAfter,
}: Props) {
  const headline = isNewRecord ? "New Course Record!" : "Round Logged";
  const subheading = isNewRecord
    ? previousHolderName
      ? `You just took ${course.name} from ${previousHolderName}.`
      : `You claimed ${course.name}.`
    : `Nice round at ${course.name}.`;

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-7 px-6 py-10">
      <WizardProgress step={3} label="Complete" />

      <Reveal className="flex flex-col items-center gap-3 rounded-2xl bg-sidebar p-10 text-center">
        <div className="motion-safe:animate-in motion-safe:zoom-in motion-safe:duration-500">
          <ShieldCheck className="h-13 w-13 text-primary" strokeWidth={1.75} />
        </div>
        <p className="font-heading text-[30px] font-bold text-sidebar-foreground">{headline}</p>
        <p className="text-sidebar-foreground/85">{subheading}</p>
      </Reveal>

      <Reveal delay={150} className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-heading text-2xl font-bold text-primary">{score}</p>
            <p className="text-xs text-muted-foreground">{course.location}</p>
          </div>
          {course.par != null && (
            <p className="font-bold text-primary">{relativeToPar(score, course.par)}</p>
          )}
        </div>
        {previousScore != null && (
          <>
            <div className="my-3 h-px bg-border" />
            <p className="text-sm text-muted-foreground">
              Previous record: {previousScore} {previousHolderName ? `— ${previousHolderName}` : ""}
            </p>
          </>
        )}
      </Reveal>

      <Reveal delay={300} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Points earned</p>
        <div className="flex justify-between text-sm">
          <span>Round logged</span>
          <span className="font-semibold">+50</span>
        </div>
        {isNewRecord && (
          <div className="flex justify-between text-sm">
            <span>New course record bonus</span>
            <span className="font-bold text-primary">+100</span>
          </div>
        )}
        {isMarquee && (
          <div className="flex justify-between text-sm">
            <span>Top 100 course bonus</span>
            <span className="font-bold text-primary">+200</span>
          </div>
        )}
        <div className="my-1 h-px bg-border" />
        <div className="flex justify-between font-heading text-lg font-bold">
          <span>Total</span>
          <span className="motion-safe:animate-count-pulse" style={{ animationDelay: "500ms" }}>
            +<AnimatedNumber value={pointsEarned} />
          </span>
        </div>
      </Reveal>

      <Reveal delay={450}>
        <LevelProgress points={totalPointsAfter} compact />
      </Reveal>

      <Reveal delay={550} className="flex flex-col items-center gap-3">
        <Button asChild className="w-full max-w-xs">
          <Link href="/map">View Territory Map</Link>
        </Button>
        <Link href="/dashboard" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          Back to Dashboard
        </Link>
      </Reveal>
    </div>
  );
}
