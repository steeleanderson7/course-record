import Link from "next/link";
import { Logo } from "@/components/Logo";

export function AuthSplitLayout({
  leftContent,
  children,
}: {
  leftContent: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="hidden w-[440px] shrink-0 flex-col justify-between bg-sidebar p-11 md:flex">
        <Link href="/" className="flex w-fit items-center transition-transform duration-200 hover:scale-105">
          <Logo scheme="dark" size={28} />
        </Link>
        {leftContent}
        <span className="text-[13px] text-sidebar-foreground/50">
          Free to play. No credit card required.
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex w-full max-w-[400px] flex-col gap-7">{children}</div>
      </div>
    </div>
  );
}
