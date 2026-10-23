import { headers } from "next/headers";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AuthMenu } from "@/components/layout/AuthMenu";
import { NavLinks } from "@/components/layout/NavLinks";
import { GroupSwitcherPill } from "@/components/layout/GroupSwitcherPill";
import { getNavContext } from "@/lib/supabase/guards";

// These routes have entirely bespoke headers in the design (dark marketing
// nav with #features/#leaderboard anchors, or a logo-only split-panel auth
// layout) — they render their own header, not this shared app-shell one.
const BESPOKE_HEADER_ROUTES = new Set(["/", "/login", "/signup"]);

export async function NavBar() {
  const pathname = (await headers()).get("x-pathname");
  if (pathname && BESPOKE_HEADER_ROUTES.has(pathname)) return null;

  const { user, group } = await getNavContext();

  return (
    <header className="w-full border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-8 py-4">
        <div className="flex items-center gap-4">
          <Link href={user ? "/dashboard" : "/"} className="transition-transform duration-200 hover:scale-105">
            <Logo size={30} />
          </Link>
          {group && <GroupSwitcherPill groupName={group.name} />}
        </div>

        {user ? (
          <>
            <NavLinks />
            <AuthMenu />
          </>
        ) : (
          <nav className="flex items-center gap-5">
            <Link href="/login" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
              Log in
            </Link>
            <Link
              href="/signup"
              className="hover-lift rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              Sign up free
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
