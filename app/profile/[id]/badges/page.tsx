import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveGroup } from "@/lib/supabase/guards";
import { buildFamilyProgress, CATEGORY_ORDER, type FamilyProgress, type TierProgress } from "@/lib/badgeCatalog";
import { getPlayerMetricsMap } from "@/lib/badgeMetrics";
import { BadgeCategoryFilter } from "@/components/badges/BadgeCategoryFilter";
import { HashScrollOnMount } from "@/components/badges/HashScrollOnMount";
import { Reveal } from "@/components/Reveal";
import { BRAND_COLORS } from "@/lib/colors";

const TOTAL_BADGES = 100;

export default async function BadgeCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireActiveGroup();

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", id).maybeSingle();
  if (!profile) notFound();

  const metrics = await getPlayerMetricsMap(supabase, id);
  const families = buildFamilyProgress(metrics);
  const totalEarned = families.reduce((sum, f) => sum + f.earnedCount, 0);

  const familiesByCategory = new Map<string, FamilyProgress[]>();
  for (const f of families) {
    const list = familiesByCategory.get(f.category) ?? [];
    list.push(f);
    familiesByCategory.set(f.category, list);
  }

  const sections = Object.fromEntries(
    CATEGORY_ORDER.map((category) => [
      category,
      <div key={category} className="flex flex-col gap-4">
        <span
          className="font-heading text-[15px] font-medium italic uppercase tracking-wide"
          style={{ color: BRAND_COLORS.gold }}
        >
          {category}
        </span>
        <div className="flex flex-col gap-4">
          {(familiesByCategory.get(category) ?? []).map((family, i) => (
            <Reveal key={family.familyId} delay={i * 40}>
              <FamilyCard family={family} />
            </Reveal>
          ))}
        </div>
      </div>,
    ])
  );

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6 px-4 py-5 md:space-y-9 md:px-8 md:py-10">
      <div className="flex flex-col gap-1.5">
        <Link href={`/profile/${id}`} className="text-[13px] font-semibold text-muted-foreground hover:text-primary">
          ← Back to profile
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-heading text-2xl font-bold md:text-[32px]">Badge Collection</h1>
          <span className="text-sm text-muted-foreground md:text-[15px]">
            {totalEarned} of {TOTAL_BADGES} badges earned
          </span>
        </div>
        <p className="max-w-[640px] text-sm text-muted-foreground">
          Every badge comes in five tiers — Bronze, Silver, Gold, Platinum, and Diamond. Keep playing to climb
          each one; locked badges show exactly what&apos;s left.
        </p>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full border border-border bg-card">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.round((totalEarned / TOTAL_BADGES) * 100)}%`,
            backgroundColor: BRAND_COLORS.gold,
          }}
        />
      </div>

      <BadgeCategoryFilter categories={CATEGORY_ORDER} sections={sections} />
      <HashScrollOnMount />
    </div>
  );
}

function FamilyCard({ family }: { family: FamilyProgress }) {
  return (
    <div
      id={`family-${family.familyId}`}
      className="flex scroll-mt-6 flex-col gap-3.5 rounded-2xl border border-border bg-card p-4 md:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-heading text-[17px] font-bold">{family.familyTitle}</span>
        <span className="text-xs font-bold text-muted-foreground">{family.earnedCount}/5 earned</span>
      </div>
      {/* 5 tiers is a fixed, always-complete set meant to be seen at a
          glance (unlike the open-ended chip rows elsewhere that use
          horizontal scroll) — shrunk to fit on a phone instead of
          scrolling, so Diamond never ends up hidden off-screen. The
          overflow-x-auto is a silent safety net only, not the intended
          interaction: the sizes below are chosen to fit a 375px viewport
          without ever needing it. */}
      <div className="flex gap-1.5 overflow-x-auto md:gap-4.5">
        {family.tiers.map((tier) => (
          <TierDot key={tier.tier} tier={tier} icon={family.icon} />
        ))}
      </div>
      <p className="text-[13px] text-muted-foreground">{family.caption}</p>
    </div>
  );
}

function TierDot({ tier, icon }: { tier: TierProgress; icon: string }) {
  return (
    <div className="flex w-14 shrink-0 flex-col items-center gap-1.5 text-center md:w-[92px]">
      <svg viewBox="0 0 56 56" aria-hidden="true" className="h-11 w-11 md:h-16 md:w-16">
        <circle
          cx={28}
          cy={28}
          r={25.5}
          fill={tier.earned ? BRAND_COLORS.cream : "#ECE6D6"}
          stroke={tier.earned ? tier.ringColor : "#C7C0AC"}
          strokeWidth={3}
        />
        <g transform="translate(16,16)" opacity={tier.earned ? 1 : 0.4}>
          <use href={`/badge-icons.svg#icon-${icon}`} width={24} height={24} />
        </g>
      </svg>
      <div className="flex flex-col gap-px">
        <span
          className="text-[9px] font-bold tracking-wide uppercase md:text-[10px]"
          style={{ color: tier.earned ? tier.ringColor : "#B8B2A0" }}
        >
          {tier.tierName}
        </span>
        <span
          className="text-[11px] leading-tight font-semibold md:text-xs"
          style={{ color: tier.earned ? BRAND_COLORS.ink : "#9AA69D" }}
        >
          {tier.title}
        </span>
      </div>
    </div>
  );
}
