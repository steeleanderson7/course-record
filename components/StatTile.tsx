import { BRAND_COLORS } from "@/lib/colors";
import { AnimatedNumber } from "@/components/AnimatedNumber";

export function StatTile({
  value,
  label,
  sublabel,
  labelColor,
}: {
  value: number;
  label: string;
  sublabel?: string;
  labelColor?: string;
}) {
  return (
    <div className="hover-lift rounded-xl border border-border bg-card p-6">
      <p className="font-heading text-3xl font-bold">
        <AnimatedNumber value={value} />
      </p>
      {sublabel && <p className="text-sm">{sublabel}</p>}
      <p
        className="mt-1 text-xs font-bold uppercase tracking-wide"
        style={{ color: labelColor ?? BRAND_COLORS.muted }}
      >
        {label}
      </p>
    </div>
  );
}
