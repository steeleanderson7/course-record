import Link from "next/link";

export function GroupSwitcherPill({ groupName }: { groupName: string }) {
  return (
    <Link
      href="/groups"
      className="border-input flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-secondary px-3 py-1.5 text-[13px] font-semibold text-foreground transition-all duration-200 hover:border-primary hover:bg-primary/10"
    >
      {groupName}
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path
          d="M2,3.5 L5,6.5 L8,3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
        />
      </svg>
    </Link>
  );
}
