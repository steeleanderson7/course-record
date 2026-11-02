import type { CSSProperties } from "react";
import { cn } from "cn";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BRAND_COLORS } from "@/lib/colors";

/**
 * The canonical "colored circle + name initial" avatar used across Profile,
 * Friends, Groups, and Course Detail — previously hand-rolled as a raw
 * `<div>` independently at each of those 4 call sites (same markup, same
 * color/contrast logic, copy-pasted). Built on the existing `Avatar`/
 * `AvatarFallback` design-system primitives rather than staying a bare div,
 * so it inherits their a11y semantics for free.
 *
 * `ringClassName` is an escape hatch for the one call site (the Groups
 * avatar-stack) that needs a card-colored cutout ring instead of the
 * default muted border, so overlapping circles still read as separate
 * avatars rather than a solid blob.
 */
export function InitialAvatar({
  name,
  color,
  isSelf = false,
  className = "h-11 w-11",
  textClassName = "text-sm",
  ringClassName,
  style,
}: {
  name: string;
  color: string;
  isSelf?: boolean;
  className?: string;
  textClassName?: string;
  ringClassName?: string;
  style?: CSSProperties;
}) {
  return (
    <Avatar className={cn(className, ringClassName)} style={style}>
      <AvatarFallback
        className={cn("font-bold", textClassName)}
        style={{ backgroundColor: color, color: isSelf ? BRAND_COLORS.ink : "#FFFFFF" }}
      >
        {name.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
