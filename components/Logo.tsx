import { BRAND_COLORS } from "@/lib/colors";

type Props = {
  /** horizontal = icon + wordmark side by side; stacked = icon above wordmark; icon = shield only. */
  variant?: "horizontal" | "stacked" | "icon";
  /** light = for cream/white backgrounds; dark = for fairway-green backgrounds. */
  scheme?: "light" | "dark";
  size?: number;
  className?: string;
};

function ShieldIcon({ scheme, size }: { scheme: "light" | "dark"; size: number }) {
  const outline = scheme === "dark" ? BRAND_COLORS.gold : BRAND_COLORS.fairway;
  const shaft = scheme === "dark" ? BRAND_COLORS.cream : BRAND_COLORS.fairway;
  const flag = scheme === "dark" ? BRAND_COLORS.gold : BRAND_COLORS.fairway;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M100,18 L168,44 L168,108 C168,150 138,176 100,192 C62,176 32,150 32,108 L32,44 Z"
        fill="none"
        stroke={outline}
        strokeWidth="7"
      />
      <line
        x1="100"
        y1="58"
        x2="100"
        y2="150"
        stroke={shaft}
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path d="M100,58 L142,76 L100,94 Z" fill={flag} />
      <ellipse cx="100" cy="150" rx="14" ry="5" fill={flag} opacity={scheme === "dark" ? 0.55 : 0.5} />
    </svg>
  );
}

export function Logo({ variant = "horizontal", scheme = "light", size, className }: Props) {
  const textColor = scheme === "dark" ? BRAND_COLORS.cream : BRAND_COLORS.ink;

  if (variant === "icon") {
    return <ShieldIcon scheme={scheme} size={size ?? 54} />;
  }

  const wordmark = (
    <span
      className="font-heading font-bold"
      style={{ color: textColor, fontSize: variant === "stacked" ? 21 : 20 }}
    >
      CourseRecord
      <span className="italic font-medium" style={{ color: BRAND_COLORS.gold }}>
        .golf
      </span>
    </span>
  );

  if (variant === "stacked") {
    return (
      <div className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
        <ShieldIcon scheme={scheme} size={size ?? 50} />
        {wordmark}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <ShieldIcon scheme={scheme} size={size ?? 30} />
      {wordmark}
    </div>
  );
}
