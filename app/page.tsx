import Link from "next/link";
import { redirect } from "next/navigation";
import { Target, ShieldCheck as DefenseIcon, Star, TrendingUp, MapPin } from "lucide-react";
import { Logo } from "@/components/Logo";
import { DecorativeUsMap } from "@/components/marketing/DecorativeUsMap";
import { getNavContext } from "@/lib/supabase/guards";
import { BRAND_COLORS } from "@/lib/colors";

export default async function MarketingHomePage() {
  const { user } = await getNavContext();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Bespoke dark marketing header */}
      <header className="w-full border-b border-sidebar-foreground/10 bg-sidebar">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-8 py-[18px]">
          <div className="flex items-center gap-2.5">
            <Logo scheme="dark" size={30} />
          </div>
          <nav className="flex items-center gap-7">
            <a href="#features" className="text-sm font-semibold text-sidebar-foreground/85 hover:text-primary">
              Features
            </a>
            <a href="#leaderboard-preview" className="text-sm font-semibold text-sidebar-foreground/85 hover:text-primary">
              Leaderboard
            </a>
          </nav>
          <div className="flex items-center gap-5">
            <Link href="/login" className="text-sm font-semibold text-sidebar-foreground/85 hover:text-primary">
              Log in
            </Link>
            <Link
              href="/signup"
              className="hover-lift rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="w-full bg-sidebar">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-12 px-8 py-20 md:grid-cols-2 md:py-24">
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 flex flex-col gap-5 motion-safe:duration-700">
            <span className="text-xs font-bold uppercase tracking-wide text-primary">For golf friend groups</span>
            <h1 className="font-heading text-[40px] font-bold leading-[1.1] text-sidebar-foreground md:text-[48px]">
              Every round is a shot at the record.
            </h1>
            <p className="max-w-[460px] text-[17px] leading-relaxed text-sidebar-foreground/80">
              Log the rounds you actually play, battle your friends for course records, and watch your territory
              grow with every win.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-5">
              <Link href="/signup" className="hover-lift rounded-lg bg-primary px-7 py-3.5 text-[15px] font-bold text-primary-foreground">
                Sign up free
              </Link>
              <Link
                href="/login"
                className="border-b border-sidebar-foreground/40 pb-0.5 text-[15px] font-semibold text-sidebar-foreground hover:border-primary hover:text-primary"
              >
                Log in
              </Link>
            </div>
            <span className="text-[13px] text-sidebar-foreground/55">Free to play. No credit card required.</span>
          </div>
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-1000">
            <DecorativeUsMap />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto flex w-full max-w-[1280px] flex-col gap-[100px] px-8 py-24">
        <FeatureRow
          eyebrow="Territory map"
          heading="Hold the record, hold the ground."
          copy="Every course where you've got the best score becomes yours on the map — styled like a real golf atlas, not a game board. Lose the record, lose the territory."
        >
          <TerritoryPreviewCard />
        </FeatureRow>

        <FeatureRow
          id="leaderboard-preview"
          eyebrow="Leaderboard"
          heading="Every friend group needs a scoreboard."
          copy="See who's got the most active records, the best round ever shot, and the longest-defended course — updated automatically every time someone logs a round."
          reverse
        >
          <LeaderboardPreviewCard />
        </FeatureRow>

        <FeatureRow
          eyebrow="Levels & badges"
          heading="Every round pays off."
          copy="Earn points for every round you log, with bonus points at Top 100 courses and marquee destinations. Level up from Rookie to Tour Pro as your course list grows, and unlock badges along the way."
        >
          <ProgressPreviewCard />
        </FeatureRow>
      </section>

      {/* Final CTA */}
      <section className="w-full bg-sidebar">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-5 px-8 py-20 text-center">
          <h2 className="font-heading text-[32px] font-bold text-sidebar-foreground">
            Start building your territory.
          </h2>
          <p className="text-sidebar-foreground/75">
            Free to play — invite your friend group and log your first round today.
          </p>
          <Link
            href="/signup"
            className="hover-lift mt-2 rounded-lg bg-primary px-8 py-3.5 text-[15px] font-bold text-primary-foreground"
          >
            Sign up free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-[#16281F]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-8 py-9">
          <Logo scheme="dark" size={24} />
          <span className="text-[13px] text-sidebar-foreground/50">© 2026 CourseRecord.golf</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureRow({
  id,
  eyebrow,
  heading,
  copy,
  reverse,
  children,
}: {
  id?: string;
  eyebrow: string;
  heading: string;
  copy: string;
  reverse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
      <div className={`flex flex-col gap-4 ${reverse ? "md:order-2" : ""}`}>
        <span className="text-xs font-bold uppercase tracking-wide text-primary">{eyebrow}</span>
        <h2 className="font-heading text-[28px] font-bold leading-tight md:text-[30px]">{heading}</h2>
        <p className="max-w-[420px] text-base leading-relaxed text-muted-foreground">{copy}</p>
      </div>
      <div className={reverse ? "md:order-1" : ""}>{children}</div>
    </div>
  );
}

function PreviewCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="hover-lift rounded-2xl border border-border bg-card p-5 shadow-[0_18px_40px_-22px_rgba(22,40,31,0.35)]">
      <p className="mb-3.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function TerritoryPreviewCard() {
  return (
    <PreviewCard label="Territory Map — National">
      <DecorativeUsMap />
    </PreviewCard>
  );
}

function LeaderboardPreviewCard() {
  const rows = [
    { rank: 1, initial: "T", name: "Taylor", color: "#6E7B91", records: "11 records" },
    { rank: 2, initial: "A", name: "Avery (you)", color: BRAND_COLORS.gold, records: "9 records", isYou: true },
  ];
  return (
    <PreviewCard label="Friend Leaderboard">
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <div
            key={r.rank}
            className={`flex items-center gap-3 rounded-lg px-2.5 py-2 ${r.isYou ? "bg-primary/10" : ""}`}
          >
            <span
              className="font-heading w-4 text-base font-bold"
              style={{ color: r.rank === 1 ? BRAND_COLORS.gold : BRAND_COLORS.muted }}
            >
              {r.rank}
            </span>
            <span
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: r.color, color: r.isYou ? BRAND_COLORS.ink : "#fff" }}
            >
              {r.initial}
            </span>
            <span className="flex-1 text-sm font-bold">{r.name}</span>
            <span className="text-sm font-bold">{r.records}</span>
          </div>
        ))}
      </div>
      <div className="my-3 h-px bg-border" />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-start gap-2.5">
          <Target className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Best Round</p>
            <p className="text-[13px] font-bold">68 (-4)</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <DefenseIcon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Longest Defense</p>
            <p className="text-[13px] font-bold">54 days</p>
          </div>
        </div>
      </div>
    </PreviewCard>
  );
}

function ProgressPreviewCard() {
  const badges = [
    { icon: Star, label: "Top 100 Club", stat: "7 of 18 played" },
    { icon: TrendingUp, label: "Century Club", stat: "119 rounds logged" },
    { icon: MapPin, label: "Globetrotter", stat: "5 states played" },
  ];
  return (
    <PreviewCard label="Your Progress">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-[30px] w-[30px] items-center justify-center rounded-full text-xs font-bold"
              style={{ backgroundColor: BRAND_COLORS.gold, color: BRAND_COLORS.ink }}
            >
              A
            </span>
            <span className="font-heading text-lg font-bold">Low Handicap</span>
          </div>
          <span className="text-[13px] font-bold text-primary">7,350 pts</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: "73.5%" }} />
        </div>
        <span className="text-xs text-muted-foreground">2,650 pts to Scratch</span>
      </div>

      <div className="my-3.5 h-px bg-border" />

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-[13px]">
          <span>Log a round</span>
          <span className="font-bold text-muted-foreground">+50 pts</span>
        </div>
        <div className="flex items-center justify-between text-[13px]">
          <span>Top 100 or marquee course</span>
          <span className="font-bold text-primary">+200 bonus</span>
        </div>
      </div>

      <div className="my-3.5 h-px bg-border" />

      <div className="grid grid-cols-3 gap-2.5">
        {badges.map((b) => (
          <div key={b.label} className="flex flex-col items-center gap-1.5 text-center">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full border-2"
              style={{ backgroundColor: BRAND_COLORS.cream, borderColor: BRAND_COLORS.gold }}
            >
              <b.icon className="h-4 w-4" style={{ color: BRAND_COLORS.ink }} strokeWidth={1.75} />
            </div>
            <span className="text-[11px] font-bold">{b.label}</span>
            <span className="text-[11px] text-muted-foreground">{b.stat}</span>
          </div>
        ))}
      </div>
    </PreviewCard>
  );
}
