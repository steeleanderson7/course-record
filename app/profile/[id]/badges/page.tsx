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
    <div className="mx-auto w-full max-w-[1280px] space-y-9 px-8 py-10">
      <div className="flex flex-col gap-1.5">
        <Link href={`/profile/${id}`} className="text-[13px] font-semibold text-muted-foreground hover:text-primary">
          ← Back to profile
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-heading text-[32px] font-bold">Badge Collection</h1>
          <span className="text-[15px] text-muted-foreground">
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
    <div id={`family-${family.familyId}`} className="flex scroll-mt-6 flex-col gap-3.5 rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-heading text-[17px] font-bold">{family.familyTitle}</span>
        <span className="text-xs font-bold text-muted-foreground">{family.earnedCount}/5 earned</span>
      </div>
      <div className="flex flex-wrap gap-4.5">
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
    <div className="flex w-[92px] flex-col items-center gap-1.5 text-center">
      <svg width="64" height="64" viewBox="0 0 56 56" aria-hidden="true">
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
          className="text-[10px] font-bold tracking-wide uppercase"
          style={{ color: tier.earned ? tier.ringColor : "#B8B2A0" }}
        >
          {tier.tierName}
        </span>
        <span
          className="text-xs leading-tight font-semibold"
          style={{ color: tier.earned ? BRAND_COLORS.ink : "#9AA69D" }}
        >
          {tier.title}
        </span>
      </div>
    </div>
  );
}
